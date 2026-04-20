import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatbotReply, ChatbotService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) { }

  @ApiOperation({ summary: 'Send a question and receive a medical chatbot response.' })
  @ApiResponse({
    status: 200,
    description: 'Returns a reply from the cloud model or local RAG fallback.',
  })
  @HttpCode(200)
  @Post('chat')
  async chat(@Body() body: ChatRequestDto): Promise<ChatbotReply> {
    return this.chatbotService.chat(body.message);
  }
}
