export class HomeProgramDto {
  id: number;
  name: string;
  pv: string;
  pace: string;
  type: string;
  startDate: Date;
  endDate: Date;

  constructor(program: any) {
    this.id = program.id;
    this.name = program.name;
    this.startDate = program.startDate;
    this.endDate = program.endDate;
    this.type = program.type;
    this.pv = program.pv;
    this.pace = program.pace;
  }
}

export class ProgramDto {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
  goal: string;
  difficultyLevel: string;
  referenceMonth: Date;
  pv: string;
  pace: string;
  vlan: string;
  paceVlan: string;
  vla: string;
  paceVla: string;
}
