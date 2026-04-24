import 'package:flutter/material.dart';

import '../../core/localization/app_strings.dart';
import '../../core/network/api_client.dart';

class ChatEntry {
  const ChatEntry({required this.message, required this.isUser});

  final String message;
  final bool isUser;
}

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({
    super.key,
    required this.strings,
    required this.apiClient,
  });

  final AppStrings strings;
  final ApiClient apiClient;

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatEntry> _messages = [];

  bool _loading = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    setState(() {
      _loading = true;
      _messages.add(ChatEntry(message: message, isUser: true));
      _messageController.clear();
    });
    _scrollToBottom();

    try {
      final body = await widget.apiClient.askChatbot(message);
      if (!mounted) return;

      setState(() {
        _messages.add(ChatEntry(
          message: body['answer']?.toString() ??
              widget.strings.t('common.error'),
          isUser: false,
        ));
      });
      _scrollToBottom();
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _messages.add(ChatEntry(message: error.message, isUser: false));
      });
      _scrollToBottom();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: Card(
              child: _messages.isEmpty
                  ? Center(
                      child: Text(
                        widget.strings.t('chatbot.empty'),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFF334155),
                            ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(14),
                      itemCount: _messages.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final item = _messages[index];
                        return Align(
                          alignment: item.isUser
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            constraints: const BoxConstraints(maxWidth: 320),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: item.isUser
                                  ? const Color(0xFFE11E2B)
                                  : const Color(0xFFE2ECF2),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Text(
                              item.message,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: item.isUser
                                        ? Colors.white
                                        : const Color(0xFF111827),
                                  ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: widget.strings.t('chatbot.message'),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(
                onPressed: _loading ? null : _send,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(widget.strings.t('chatbot.send')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
