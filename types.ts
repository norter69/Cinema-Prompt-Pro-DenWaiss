
export enum ShotType {
  CLOSEUP = 'CLOSEUP',
  MEDIUM = 'MEDIUM',
  FULLBODY = 'FULLBODY'
}

export enum MovementGroup {
  AXIS_ROTATION = 'Вращение по осям',
  ZOOM_OPTICS = 'Зум и оптика',
  PHYSICAL_TRAVEL = 'Физическое перемещение',
  COMPLEX_CINEMATIC = 'Киноэффекты',
  STYLE_VIBE = 'Стиль и атмосфера',
  DYNAMIC_ACTION = 'Экшен и динамика'
}

export interface Movement {
  id: string;
  name: string;
  description: string;
  group: MovementGroup;
}

export interface ShotConfig {
  shot: string;
  lens: string;
  aperture: string;
  visuals: string;
}
