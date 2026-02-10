
import { ShotType, MovementGroup, Movement, ShotConfig } from './types';

export const SHOT_CONFIGS: Record<ShotType, ShotConfig> = {
  [ShotType.CLOSEUP]: {
    shot: "Extreme Close-up or Close-up",
    lens: "85mm or 100mm Macro Lens",
    aperture: "f/1.8 or f/2.8",
    visuals: "Shallow depth of field, creamy bokeh, high texture detail, focus on eyes/objects"
  },
  [ShotType.MEDIUM]: {
    shot: "Medium Shot, Waist-up",
    lens: "35mm or 50mm Prime Lens",
    aperture: "f/4.0 or f/5.6",
    visuals: "Natural perception, clear subject, balanced background context"
  },
  [ShotType.FULLBODY]: {
    shot: "Wide Shot, Full Body, Establishing Shot",
    lens: "24mm or 16mm Wide Angle",
    aperture: "f/11 or f/16",
    visuals: "Deep depth of field, everything in focus (subject + environment), epic scale"
  }
};

export const MOVEMENTS: Movement[] = [
  // ГРУППА A: ВРАЩЕНИЕ
  { id: 'STATIC_LOCKED', name: 'Статичная камера', description: 'Static, locked-off camera shot with no movement.', group: MovementGroup.AXIS_ROTATION },
  { id: 'PAN_LEFT', name: 'Панорама влево', description: 'Slow cinematic pan to the left.', group: MovementGroup.AXIS_ROTATION },
  { id: 'PAN_RIGHT', name: 'Панорама вправо', description: 'Slow cinematic pan to the right.', group: MovementGroup.AXIS_ROTATION },
  { id: 'TILT_UP', name: 'Наклон вверх', description: 'Camera tilting upwards from ground to sky.', group: MovementGroup.AXIS_ROTATION },
  { id: 'TILT_DOWN', name: 'Наклон вниз', description: 'Camera tilting downwards.', group: MovementGroup.AXIS_ROTATION },
  { id: 'ROLL', name: 'Голландский угол', description: 'Dutch angle roll, camera rotating on Z-axis, disorienting.', group: MovementGroup.AXIS_ROTATION },
  { id: 'WHIP_PAN', name: 'Хлыст-панорама', description: 'Fast, blurred cinematic whip pan for high-speed transition.', group: MovementGroup.AXIS_ROTATION },
  { id: 'SWISH_TILT', name: 'Резкий наклон', description: 'Aggressive vertical swish tilt, creating a rapid motion blur.', group: MovementGroup.AXIS_ROTATION },

  // ГРУППА B: ЗУМ И ОПТИКА
  { id: 'ZOOM_IN', name: 'Наезд (зум)', description: 'Smooth optical zoom in, compressing background.', group: MovementGroup.ZOOM_OPTICS },
  { id: 'ZOOM_OUT', name: 'Отъезд (зум)', description: 'Smooth optical zoom out, revealing context.', group: MovementGroup.ZOOM_OPTICS },
  { id: 'CRASH_ZOOM', name: 'Резкий наезд', description: 'Fast aggressive snap-zoom, dramatic impact.', group: MovementGroup.ZOOM_OPTICS },
  { id: 'RACK_FOCUS', name: 'Перевод фокуса', description: 'Rack focus, shifting sharpness from foreground to background.', group: MovementGroup.ZOOM_OPTICS },
  { id: 'DOLLY_ZOOM', name: 'Эффект Вертиго', description: 'Vertigo effect, background warps while subject size remains constant.', group: MovementGroup.ZOOM_OPTICS },
  { id: 'SLOW_ZOOM', name: 'Медленный наплыв', description: 'Extremely subtle and slow optical zoom for building tension.', group: MovementGroup.ZOOM_OPTICS },
  { id: 'SNAP_FOCUS', name: 'Мгновенный фокус', description: 'Instant snap focus shift from a blurred foreground to a sharp subject.', group: MovementGroup.ZOOM_OPTICS },

  // ГРУППА C: ПЕРЕМЕЩЕНИЕ
  { id: 'DOLLY_IN', name: 'Долли вперед', description: 'Physical camera pushing forward towards subject.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'DOLLY_OUT', name: 'Долли назад', description: 'Physical camera pulling back away from subject.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'TRUCK_LEFT', name: 'Слайд влево', description: 'Camera sliding sideways (left) parallel to scene.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'TRUCK_RIGHT', name: 'Слайд вправо', description: 'Camera sliding sideways (right) parallel to scene.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'PEDESTAL_UP', name: 'Лифт вверх', description: 'Camera lifting vertically straight up.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'PEDESTAL_DOWN', name: 'Лифт вниз', description: 'Camera lowering vertically straight down.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'FOLLOW_LEAD', name: 'Ведущее следование', description: 'Tracking shot from the front, leading the subject as they move forward.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'RETRO_FOLLOW', name: 'Преследование сзади', description: 'Classic follow shot from behind the subject at shoulder height.', group: MovementGroup.PHYSICAL_TRAVEL },
  { id: 'WORM_ANGLE_SLIDE', name: 'Слайд снизу', description: 'Low-to-ground worm\'s eye view slide, emphasizing scale and height.', group: MovementGroup.PHYSICAL_TRAVEL },

  // ГРУППА D: КИНОЭФФЕКТЫ
  { id: 'TRACKING', name: 'Слежение', description: 'Tracking shot, following the subject at a fixed distance.', group: MovementGroup.COMPLEX_CINEMATIC },
  { id: 'ORBIT', name: 'Орбита', description: 'Orbital shot, circling 360 degrees around the subject.', group: MovementGroup.COMPLEX_CINEMATIC },
  { id: 'ARC', name: 'Дуга', description: 'Arc shot, semi-circular movement around subject.', group: MovementGroup.COMPLEX_CINEMATIC },
  { id: 'CRANE', name: 'Кран', description: 'Jib/Crane shot, high sweeping movement over the scene.', group: MovementGroup.COMPLEX_CINEMATIC },
  { id: 'SPIRAL_ASCENT', name: 'Спиральный подъем', description: 'Complex spiral movement ascending upwards, combining rotation and elevation.', group: MovementGroup.COMPLEX_CINEMATIC },
  { id: 'OVERHEAD_SWEEP', name: 'Пролет сверху', description: 'Bird\'s eye view overhead sweep, flying straight over the scene.', group: MovementGroup.COMPLEX_CINEMATIC },

  // ГРУППА E: СТИЛЬ
  { id: 'HANDHELD', name: 'С рук', description: 'Handheld camera, organic shake, documentary realism.', group: MovementGroup.STYLE_VIBE },
  { id: 'STEADICAM', name: 'Стейдикам', description: 'Steadicam, ultra-smooth floating movement.', group: MovementGroup.STYLE_VIBE },
  { id: 'POV', name: 'От 1-го лица', description: "First Person View, seeing through character's eyes.", group: MovementGroup.STYLE_VIBE },
  { id: 'FPV_DRONE', name: 'FPV-дрон', description: 'FPV Drone, high speed, banking turns, acrobatic flight.', group: MovementGroup.STYLE_VIBE },
  { id: 'BODY_CAM', name: 'Боди-кам', description: 'Rigidly attached body camera, moving in perfect sync with the character\'s torso.', group: MovementGroup.STYLE_VIBE },
  { id: 'DREAM_WOBBLE', name: 'Сонная дымка', description: 'Slow, floating, slightly disorienting wobble for a dream-like sequence.', group: MovementGroup.STYLE_VIBE },

  // ГРУППА F: ЭКШЕН И ДИНАМИКА
  { id: 'FPV_ORBIT', name: 'FPV-дрон (орбита)', description: 'High-speed dynamic FPV drone orbital flight around the subject with aggressive banking and immersive rotation.', group: MovementGroup.DYNAMIC_ACTION },
  { id: 'SNORRICAM', name: 'Сноррикам', description: 'Snorricam mount fixed to the subject, keeping the face centered while the background moves wildly.', group: MovementGroup.DYNAMIC_ACTION },
  { id: 'BULLET_TIME', name: 'Время пули', description: 'Static rotation effect where the scene freezes and the camera circles the subject.', group: MovementGroup.DYNAMIC_ACTION },
  { id: 'SHAKY_EXPLOSION', name: 'Эффект взрыва', description: 'High-intensity erratic vibration simulating a nearby explosion or heavy impact.', group: MovementGroup.DYNAMIC_ACTION },
  { id: 'WHIRL_ORBIT', name: 'Вихревая орбита', description: 'Fast, dizzying orbital spin around the subject at high velocity.', group: MovementGroup.DYNAMIC_ACTION },
  { id: 'CRASH_CAM', name: 'Камера-таран', description: 'Camera charging directly into a subject or obstacle, stopping inches before impact.', group: MovementGroup.DYNAMIC_ACTION }
];
