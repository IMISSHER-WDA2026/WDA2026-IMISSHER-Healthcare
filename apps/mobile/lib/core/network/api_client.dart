import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class AuthSession {
  AuthSession({
    required this.token,
    required this.userId,
    required this.email,
    required this.fullName,
    this.phone,
    this.bloodType,
    this.allergies,
    this.chronicConditions,
    this.emergencyContactName,
    this.emergencyContactPhone,
  });

  final String token;
  final String userId;
  final String email;
  final String fullName;
  final String? phone;
  final String? bloodType;
  final String? allergies;
  final String? chronicConditions;
  final String? emergencyContactName;
  final String? emergencyContactPhone;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final user = (json['user'] as Map<String, dynamic>? ?? {});

    String? normalizeOptionalText(dynamic value) {
      final text = value?.toString().trim();
      if (text == null || text.isEmpty) {
        return null;
      }
      return text;
    }

    return AuthSession(
      token: json['token']?.toString() ?? '',
      userId: user['id']?.toString() ?? '',
      email: user['email']?.toString() ?? '',
      fullName: user['fullName']?.toString() ?? '',
      phone: normalizeOptionalText(user['phone']),
      bloodType: normalizeOptionalText(user['bloodType']),
      allergies: normalizeOptionalText(user['allergies']),
      chronicConditions: normalizeOptionalText(user['chronicConditions']),
      emergencyContactName: normalizeOptionalText(user['emergencyContactName']),
      emergencyContactPhone: normalizeOptionalText(
        user['emergencyContactPhone'],
      ),
    );
  }
}

class ApiClient {
  ApiClient({required this.baseUrl});

  final String baseUrl;

  Future<AuthSession> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final body = await _request(
      '/auth/register',
      method: 'POST',
      body: {'email': email, 'password': password, 'fullName': fullName},
    );

    return AuthSession.fromJson(body);
  }

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final body = await _request(
      '/auth/login',
      method: 'POST',
      body: {'email': email, 'password': password},
    );

    return AuthSession.fromJson(body);
  }

  Future<Map<String, dynamic>> getMe(String token) {
    return _requestMap('/users/me', token: token);
  }

  Future<Map<String, dynamic>> updateMe({
    required String token,
    required String fullName,
    String? phone,
    String? bloodType,
    String? allergies,
    String? chronicConditions,
    String? emergencyContactName,
    String? emergencyContactPhone,
  }) {
    String? sanitize(String? value) {
      final text = value?.trim();
      if (text == null || text.isEmpty) {
        return null;
      }
      return text;
    }

    final normalizedPhone = sanitize(phone);
    final normalizedBloodType = sanitize(bloodType);
    final normalizedAllergies = sanitize(allergies);
    final normalizedChronicConditions = sanitize(chronicConditions);
    final normalizedEmergencyContactName = sanitize(emergencyContactName);
    final normalizedEmergencyContactPhone = sanitize(emergencyContactPhone);

    Map<String, dynamic>? optionalEntry(String key, String? value) =>
        value == null ? null : <String, dynamic>{key: value};

    return _requestMap(
      '/users/me',
      method: 'PATCH',
      token: token,
      body: {
        'fullName': fullName,
        ...?optionalEntry('phone', normalizedPhone),
        ...?optionalEntry('bloodType', normalizedBloodType),
        ...?optionalEntry('allergies', normalizedAllergies),
        ...?optionalEntry('chronicConditions', normalizedChronicConditions),
        ...?optionalEntry(
          'emergencyContactName',
          normalizedEmergencyContactName,
        ),
        ...?optionalEntry(
          'emergencyContactPhone',
          normalizedEmergencyContactPhone,
        ),
      },
    );
  }

  Future<Map<String, dynamic>> createSos({
    required String token,
    required String userId,
    required String note,
  }) {
    return _requestMap(
      '/sos',
      method: 'POST',
      token: token,
      body: {
        'userId': userId,
        'triggerSource': 'button',
        if (note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
  }

  Future<List<dynamic>> getMedicines() async {
    final body = await _request('/medicines');
    if (body is List<dynamic>) {
      return body;
    }
    return [];
  }

  Future<Map<String, dynamic>?> lookupMedicineByBarcode(String barcode) async {
    final code = barcode.trim();
    if (code.isEmpty) {
      throw ApiException('Barcode cannot be empty.');
    }

    final payload = await _request(
      '/medicines/barcode/${Uri.encodeComponent(code)}',
      allow404: true,
    );

    if (payload is Map<String, dynamic>) {
      return payload;
    }

    return null;
  }

  Future<Map<String, dynamic>> askChatbot(String message) {
    return _requestMap(
      '/chatbot/chat',
      method: 'POST',
      body: {'message': message},
    );
  }

  Future<Map<String, dynamic>> _requestMap(
    String path, {
    String method = 'GET',
    String? token,
    Map<String, dynamic>? body,
  }) async {
    final payload = await _request(
      path,
      method: method,
      token: token,
      body: body,
    );
    if (payload is Map<String, dynamic>) {
      return payload;
    }

    throw ApiException('Unexpected response format.');
  }

  Future<dynamic> _request(
    String path, {
    String method = 'GET',
    String? token,
    Map<String, dynamic>? body,
    bool allow404 = false,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };

    late http.Response response;
    switch (method) {
      case 'POST':
        response = await http.post(
          uri,
          headers: headers,
          body: jsonEncode(body ?? {}),
        );
        break;
      case 'PATCH':
        response = await http.patch(
          uri,
          headers: headers,
          body: jsonEncode(body ?? {}),
        );
        break;
      default:
        response = await http.get(uri, headers: headers);
        break;
    }

    dynamic payload;
    if (response.body.isNotEmpty) {
      payload = jsonDecode(response.body);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (allow404 && response.statusCode == 404) {
        return null;
      }

      final message = payload is Map<String, dynamic>
          ? payload['message']?.toString() ?? 'Request failed'
          : 'Request failed';
      throw ApiException(message, statusCode: response.statusCode);
    }

    return payload;
  }
}
