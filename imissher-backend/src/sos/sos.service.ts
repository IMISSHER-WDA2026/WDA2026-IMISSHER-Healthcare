import { Injectable } from '@nestjs/common';
import { CreateSoDto } from './dto/create-so.dto';
import { UpdateSoDto } from './dto/update-so.dto';

@Injectable()
export class SosService {
  create(createSoDto: CreateSoDto) {
    return 'This action adds a new so';
  }

  findAll() {
    return `This action returns all sos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} so`;
  }

  update(id: number, updateSoDto: UpdateSoDto) {
    return `This action updates a #${id} so`;
  }

  remove(id: number) {
    return `This action removes a #${id} so`;
  }
}
