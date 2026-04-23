import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class EmergencyContact {
  EmergencyContact({required this.name, required this.phone});

  final String name;
  final String phone;

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      name: json['name']?.toString().trim() ?? '',
      phone: json['phone']?.toString().trim() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {'name': name.trim(), 'phone': phone.trim()};
  }
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
    required this.emergencyContacts,
  });

  final String token;
  final String userId;
  final String email;
  final String fullName;
  final String? phone;
  final String? bloodType;
  final String? allergies;
  final String? chronicConditions;
  final List<EmergencyContact> emergencyContacts;

  String? get emergencyContactName =>
      emergencyContacts.isNotEmpty ? emergencyContacts.first.name : null;

  String? get emergencyContactPhone =>
      emergencyContacts.isNotEmpty ? emergencyContacts.first.phone : null;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? {};

    String? normalizeOptionalText(dynamic value) {
      final text = value?.toString().trim();
      if (text == null || text.isEmpty) {
        return null;
      }
      return text;
    }

    final rawContacts = user['emergencyContacts'];
    final parsedContacts = <EmergencyContact>[];

    if (rawContacts is List<dynamic>) {
      for (final item in rawContacts.whereType<Map>()) {
        final contact = EmergencyContact.fromJson(
          Map<String, dynamic>.from(item),
        );
        if (contact.name.isNotEmpty && contact.phone.isNotEmpty) {
          parsedContacts.add(contact);
        }
      }
    }

    if (parsedContacts.isEmpty) {
      final legacyName = normalizeOptionalText(user['emergencyContactName']);
      final legacyPhone = normalizeOptionalText(user['emergencyContactPhone']);
      if (legacyName != null && legacyPhone != null) {
        parsedContacts.add(
          EmergencyContact(name: legacyName, phone: legacyPhone),
        );
      }
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
      emergencyContacts: parsedContacts,
    );
  }
}

class ApiClient {
  ApiClient({required this.baseUrl}) {
    _baseUrlCandidates = _buildBaseUrlCandidates(baseUrl);
    _activeBaseUrl = _baseUrlCandidates.first;
  }

  final String baseUrl;

  late final List<String> _baseUrlCandidates;
  late String _activeBaseUrl;

  String? _sanitizeOptionalText(String? value) {
    final text = value?.trim();
    if (text == null || text.isEmpty) {
      return null;
    }

    return text;
  }

  Map<String, dynamic>? _optionalEntry(String key, dynamic value) {
    if (value == null) {
      return null;
    }

    return <String, dynamic>{key: value};
  }

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
    List<EmergencyContact>? emergencyContacts,
  }) {
    final normalizedPhone = _sanitizeOptionalText(phone);
    final normalizedBloodType = _sanitizeOptionalText(bloodType);
    final normalizedAllergies = _sanitizeOptionalText(allergies);
    final normalizedChronicConditions = _sanitizeOptionalText(
      chronicConditions,
    );
    final normalizedEmergencyContactName = _sanitizeOptionalText(
      emergencyContactName,
    );
    final normalizedEmergencyContactPhone = _sanitizeOptionalText(
      emergencyContactPhone,
    );
    final normalizedEmergencyContacts =
        (emergencyContacts ?? <EmergencyContact>[])
            .where(
              (contact) =>
                  contact.name.trim().isNotEmpty &&
                  contact.phone.trim().isNotEmpty,
            )
            .take(5)
            .map((contact) => contact.toJson())
            .toList();

    return _requestMap(
      '/users/me',
      method: 'PATCH',
      token: token,
      body: {
        'fullName': fullName,
        ...?_optionalEntry('phone', normalizedPhone),
        ...?_optionalEntry('bloodType', normalizedBloodType),
        ...?_optionalEntry('allergies', normalizedAllergies),
        ...?_optionalEntry('chronicConditions', normalizedChronicConditions),
        ...?_optionalEntry(
          'emergencyContactName',
          normalizedEmergencyContactName,
        ),
        ...?_optionalEntry(
          'emergencyContactPhone',
          normalizedEmergencyContactPhone,
        ),
        'emergencyContacts': normalizedEmergencyContacts,
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

  Future<List<dynamic>> getMedicines({
    String? ownerId,
    bool mineOnly = false,
    String? token,
  }) async {
    final queryParameters = <String, String>{};

    final normalizedOwnerId = ownerId?.trim();
    if (normalizedOwnerId != null && normalizedOwnerId.isNotEmpty) {
      queryParameters['ownerId'] = normalizedOwnerId;
    }
    if (mineOnly) {
      queryParameters['mineOnly'] = 'true';
    }

    final path = queryParameters.isEmpty
        ? '/medicines'
        : '/medicines?${Uri(queryParameters: queryParameters).query}';

    final body = await _request(path, token: token);
    if (body is List<dynamic>) {
      return body;
    }
    return [];
  }

  Future<Map<String, dynamic>> createMedicine({
    required String token,
    required String ownerId,
    required String name,
    String? activeIngredient,
    String? barcode,
    String? description,
    String? contraindications,
    int? quantity,
    String? unit,
    String? expiresAt,
    String? reminderTime,
  }) {
    final normalizedName = name.trim();
    if (normalizedName.isEmpty) {
      throw ApiException('Medicine name is required.');
    }

    return _requestMap(
      '/medicines',
      method: 'POST',
      token: token,
      body: {
        'name': normalizedName,
        'ownerId': ownerId,
        ...?_optionalEntry(
          'active_ingredient',
          _sanitizeOptionalText(activeIngredient),
        ),
        ...?_optionalEntry('barcode', _sanitizeOptionalText(barcode)),
        ...?_optionalEntry('description', _sanitizeOptionalText(description)),
        ...?_optionalEntry(
          'contraindications',
          _sanitizeOptionalText(contraindications),
        ),
        ...?_optionalEntry('quantity', quantity),
        ...?_optionalEntry('unit', _sanitizeOptionalText(unit)),
        ...?_optionalEntry('expiresAt', _sanitizeOptionalText(expiresAt)),
        ...?_optionalEntry('reminderTime', _sanitizeOptionalText(reminderTime)),
      },
    );
  }

  Future<Map<String, dynamic>?> lookupMedicineByBarcode(String barcode, {String? token}) async {
    final code = barcode.trim();
    if (code.isEmpty) {
      throw ApiException('Barcode cannot be empty.');
    }

    final payload = await _request(
      '/medicines/barcode/${Uri.encodeComponent(code)}',
      token: token,
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
    final candidateBaseUrls = [
      _activeBaseUrl,
      ..._baseUrlCandidates.where((base) => base != _activeBaseUrl),
    ];

    final failedConnectionUris = <String>[];

    for (final candidateBaseUrl in candidateBaseUrls) {
      final uri = Uri.parse('$candidateBaseUrl$path');
      final headers = <String, String>{
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      };

      try {
        late http.Response response;
        switch (method) {
          case 'POST':
            response = await http
                .post(uri, headers: headers, body: jsonEncode(body ?? {}))
                .timeout(const Duration(seconds: 10));
            break;
          case 'PATCH':
            response = await http
                .patch(uri, headers: headers, body: jsonEncode(body ?? {}))
                .timeout(const Duration(seconds: 10));
            break;
          default:
            response = await http
                .get(uri, headers: headers)
                .timeout(const Duration(seconds: 10));
            break;
        }

        dynamic payload;
        if (response.body.isNotEmpty) {
          payload = jsonDecode(response.body);
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          if (allow404 && response.statusCode == 404) {
            _activeBaseUrl = candidateBaseUrl;
            return null;
          }

          throw ApiException(
            _extractErrorMessage(payload),
            statusCode: response.statusCode,
          );
        }

        _activeBaseUrl = candidateBaseUrl;
        return payload;
      } on SocketException {
        failedConnectionUris.add(uri.toString());
      } on HttpException {
        failedConnectionUris.add(uri.toString());
      } on http.ClientException {
        failedConnectionUris.add(uri.toString());
      }
    }

    throw ApiException(
      'Unable to connect to backend. Tried: ${failedConnectionUris.join(', ')}. '
      'If you run on a physical device, set --dart-define=HEALTHCARE_API_BASE_URL=http://<your-lan-ip>:3000.',
    );
  }

  String _extractErrorMessage(dynamic payload) {
    if (payload is! Map<String, dynamic>) {
      return 'Request failed.';
    }

    final message = payload['message'];
    if (message is List<dynamic>) {
      final lines = message
          .map((item) => item.toString())
          .where((item) => item.isNotEmpty);
      final joined = lines.join(', ');
      if (joined.isNotEmpty) {
        return joined;
      }
    }

    final fallback = message?.toString();
    if (fallback != null && fallback.trim().isNotEmpty) {
      return fallback;
    }

    return 'Request failed.';
  }

  List<String> _buildBaseUrlCandidates(String configuredBaseUrl) {
    String normalize(String value) {
      return value.trim().replaceFirst(RegExp(r'/+$'), '');
    }

    final normalizedConfiguredBase = normalize(configuredBaseUrl);
    final configuredUri = Uri.parse(normalizedConfiguredBase);

    final candidates = <String>[normalizedConfiguredBase];

    if ((configuredUri.host == '10.0.2.2' ||
            configuredUri.host == 'localhost' ||
            configuredUri.host == '127.0.0.1') &&
        configuredUri.port != 0) {
      candidates.add(
        '${configuredUri.scheme}://10.0.2.2:${configuredUri.port}',
      );
      candidates.add(
        '${configuredUri.scheme}://localhost:${configuredUri.port}',
      );
      candidates.add(
        '${configuredUri.scheme}://127.0.0.1:${configuredUri.port}',
      );
    }

    final seen = <String>{};
    final deduplicated = <String>[];

    for (final candidate in candidates) {
      final normalized = normalize(candidate);
      if (normalized.isEmpty || seen.contains(normalized)) {
        continue;
      }

      seen.add(normalized);
      deduplicated.add(normalized);
    }

    return deduplicated;
  }
}
