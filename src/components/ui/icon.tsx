import Svg, { Circle, Path } from 'react-native-svg';

import { useUiScale } from '@/hooks/use-ui-scale';

/**
 * The app's icon set: simple, monochrome line icons drawn as SVG so they take
 * the current theme's colour and stay crisp at any size. These replace the
 * emoji that used to stand in for section icons.
 *
 * Every icon is drawn on a 24×24 grid with round caps and no fills, so they
 * read as one family.
 */
export type IconName =
  | 'home'
  | 'todo'
  | 'meals'
  | 'inventory'
  | 'cart'
  | 'projects'
  | 'spending'
  | 'grocery'
  | 'search'
  | 'plus'
  | 'minus'
  | 'pencil'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'download'
  | 'upload'
  | 'image'
  | 'grip'
  | 'check'
  | 'alert'
  | 'trash'
  | 'clock'
  | 'list'
  | 'leaf'
  | 'box'
  | 'plate'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'note'
  | 'repeat'
  | 'calendar'
  | 'trend-up'
  | 'trend-down'
  | 'chart'
  | 'wallet'
  | 'panel';

interface IconShape {
  paths?: string[];
  circles?: [number, number, number][];
  /** Dots that are filled rather than stroked (used for the drag grip). */
  filled?: [number, number, number][];
}

const ICONS: Record<IconName, IconShape> = {
  home: { paths: ['M3 10.2 12 3l9 7.2V21h-6v-6H9v6H3z'] },
  todo: { paths: ['M4 4.5h16v15H4z', 'M8 12.5l2.5 2.5L16 9.5'] },
  meals: { paths: ['M4 11h16a8 8 0 0 1-16 0z', 'M9 7.5c0-1.6 1-2.6 2.5-3.2'] },
  inventory: { paths: ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4', 'M12 12v8'] },
  cart: {
    paths: ['M3 5h2.2l2.3 10h9.6L20 8H6'],
    circles: [
      [9.5, 19, 1.4],
      [16.5, 19, 1.4],
    ],
  },
  projects: { paths: ['M3 20h18', 'M6 20v-6', 'M11 20V6', 'M16 20v-9'] },
  spending: { paths: ['M3 7h18v12H3z', 'M3 7l14-3v3', 'M16 13h3'] },
  grocery: { paths: ['M20 4c-8 0-14 4-14 11 0 3 2 5 5 5 7 0 9-8 9-16z', 'M7 17c3-4 6-6 10-8'] },
  leaf: { paths: ['M20 4c-8 0-14 4-14 11 0 3 2 5 5 5 7 0 9-8 9-16z', 'M7 17c3-4 6-6 10-8'] },
  box: { paths: ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4', 'M12 12v8'] },
  plate: { paths: ['M4 11h16a8 8 0 0 1-16 0z', 'M9 7.5c0-1.6 1-2.6 2.5-3.2'] },
  search: { paths: ['M16.5 16.5 21 21'], circles: [[11, 11, 6.5]] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  minus: { paths: ['M5 12h14'] },
  pencil: { paths: ['M4 20l4-1L19 8l-3-3L5 16z', 'M14 6l3 3'] },
  close: { paths: ['M6 6l12 12', 'M18 6 6 18'] },
  'chevron-left': { paths: ['M15 5l-7 7 7 7'] },
  'chevron-right': { paths: ['M9 5l7 7-7 7'] },
  'chevron-down': { paths: ['M5 9l7 7 7-7'] },
  download: { paths: ['M12 4v11', 'M7 12l5 5 5-5', 'M4 20h16'] },
  upload: { paths: ['M12 20V9', 'M7 12l5-5 5 5', 'M4 4h16'] },
  image: {
    paths: ['M4 5h16v14H4z', 'M4 16.5l5-5 4 4 3-3 4 4'],
    circles: [[8.5, 9.5, 1.4]],
  },
  grip: {
    filled: [
      [9, 6, 1.1],
      [15, 6, 1.1],
      [9, 12, 1.1],
      [15, 12, 1.1],
      [9, 18, 1.1],
      [15, 18, 1.1],
    ],
  },
  check: { paths: ['M5 13l4 4 10-11'] },
  alert: { paths: ['M12 4l9 16H3z', 'M12 10v4'], circles: [[12, 16.8, 0.5]] },
  trash: { paths: ['M4 7h16', 'M9 7V4.5h6V7', 'M6.5 7l1 13h9l1-13'] },
  clock: { paths: ['M12 8.5V12l2.5 2'], circles: [[12, 12, 8]] },
  list: {
    paths: ['M8.5 6h11.5', 'M8.5 12h11.5', 'M8.5 18h11.5'],
    filled: [
      [4.5, 6, 1.1],
      [4.5, 12, 1.1],
      [4.5, 18, 1.1],
    ],
  },
  sun: {
    circles: [[12, 12, 4]],
    paths: [
      'M12 2.5v2',
      'M12 19.5v2',
      'M2.5 12h2',
      'M19.5 12h2',
      'M5.2 5.2l1.4 1.4',
      'M17.4 17.4l1.4 1.4',
      'M18.8 5.2l-1.4 1.4',
      'M6.6 17.4l-1.4 1.4',
    ],
  },
  note: { paths: ['M5 3.5h9l5 5V20.5H5z', 'M14 3.5V9h5', 'M8.5 13h7', 'M8.5 16.5h4.5'] },
  moon: { paths: ['M20.5 14.8A8.7 8.7 0 0 1 9.2 3.5a8.7 8.7 0 1 0 11.3 11.3z'] },
  monitor: { paths: ['M3 5h18v11H3z', 'M12 16v4', 'M8.5 20h7'] },
  repeat: {
    paths: [
      'M4.5 12A7.5 7.5 0 0 1 12 4.5h6.5',
      'M19.5 12a7.5 7.5 0 0 1-7.5 7.5H5.5',
      'M15.6 1.8 18.9 4.5l-3.3 2.7',
      'M8.4 16.8l-3.3 2.7 3.3 2.7',
    ],
  },
  calendar: { paths: ['M4 6h16v14H4z', 'M4 10.5h16', 'M8 3.5v4', 'M16 3.5v4'] },
  'trend-up': { paths: ['M4 17l6-6 4 4 6.5-6.5', 'M15.5 8.5H21V14'] },
  'trend-down': { paths: ['M4 7l6 6 4-4 6.5 6.5', 'M15.5 15.5H21V10'] },
  chart: { paths: ['M4 20V4', 'M4 20h16', 'M8.5 17v-5', 'M13 17V8', 'M17.5 17v-8'] },
  wallet: { paths: ['M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3', 'M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H5.5', 'M16.5 14h.01'] },
  panel: { paths: ['M4 5h16v14H4z', 'M9.5 5v14'] },
};

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 1.6,
  testID,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  testID?: string;
}) {
  const shape = ICONS[name];
  // Icons keep their proportion to the text beside them as the window changes.
  const scale = useUiScale();
  const drawn = Math.round(size * scale);
  const drawnStroke = Math.round(strokeWidth * scale * 100) / 100;

  return (
    <Svg testID={testID} width={drawn} height={drawn} viewBox="0 0 24 24">
      {shape.paths?.map((path) => (
        <Path
          key={path}
          d={path}
          stroke={color}
          strokeWidth={drawnStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {shape.circles?.map(([cx, cy, r]) => (
        <Circle
          key={`c-${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={drawnStroke}
          fill="none"
        />
      ))}
      {shape.filled?.map(([cx, cy, r]) => (
        <Circle key={`f-${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
      ))}
    </Svg>
  );
}
