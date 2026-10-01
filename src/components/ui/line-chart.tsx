import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/format';

export interface ChartPoint {
  /** Short label under the point — usually a date like "Sep 28". */
  label: string;
  value: number;
}

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const PADDING = { left: 46, right: 16, top: 14, bottom: 26 };
const INNER_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * The Grocery Tracker's price-history chart: one dot per purchase, drawn in
 * a fixed viewBox so it scales to whatever width the card gets.
 */
export function LineChart({
  points,
  height = 180,
  testID = 'line-chart',
}: {
  points: ChartPoint[];
  height?: number;
  testID?: string;
}) {
  const theme = useTheme();

  if (points.length === 0) {
    return (
      <ThemedText type="caption" themeColor="textTertiary" testID={testID}>
        Nothing to chart yet.
      </ThemedText>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const yFor = (value: number) =>
    span === 0 ? PADDING.top + INNER_HEIGHT / 2 : PADDING.top + INNER_HEIGHT - ((value - min) / span) * INNER_HEIGHT;
  const xFor = (index: number) =>
    points.length === 1 ? PADDING.left + INNER_WIDTH / 2 : PADDING.left + (index / (points.length - 1)) * INNER_WIDTH;

  const coords = points.map((point, index) => ({
    ...point,
    x: xFor(index),
    y: yFor(point.value),
  }));

  return (
    <Svg testID={testID} width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
      <Line
        x1={PADDING.left}
        y1={PADDING.top + INNER_HEIGHT}
        x2={VIEW_WIDTH - PADDING.right}
        y2={PADDING.top + INNER_HEIGHT}
        stroke={theme.border}
        strokeWidth={1}
      />

      <SvgText x={PADDING.left - 6} y={PADDING.top + 4} fontSize={10} fill={theme.textTertiary} textAnchor="end">
        {formatMoney(max)}
      </SvgText>
      <SvgText
        x={PADDING.left - 6}
        y={PADDING.top + INNER_HEIGHT}
        fontSize={10}
        fill={theme.textTertiary}
        textAnchor="end">
        {formatMoney(min)}
      </SvgText>

      {coords.length > 1 ? (
        <Polyline
          testID={`${testID}-line`}
          points={coords.map((coord) => `${coord.x},${coord.y}`).join(' ')}
          fill="none"
          stroke={theme.primary}
          strokeWidth={2}
        />
      ) : null}

      {coords.map((coord, index) => (
        <Circle
          key={`${coord.label}-${index}`}
          testID={`${testID}-dot-${index}`}
          cx={coord.x}
          cy={coord.y}
          r={4}
          fill={theme.primary}
        />
      ))}

      <SvgText x={PADDING.left} y={VIEW_HEIGHT - 8} fontSize={10} fill={theme.textTertiary} textAnchor="start">
        {points[0].label}
      </SvgText>
      {points.length > 1 ? (
        <SvgText
          x={VIEW_WIDTH - PADDING.right}
          y={VIEW_HEIGHT - 8}
          fontSize={10}
          fill={theme.textTertiary}
          textAnchor="end">
          {points[points.length - 1].label}
        </SvgText>
      ) : null}
    </Svg>
  );
}

/** A tiny line for list rows — no axes, no labels. */
export function Sparkline({
  values,
  width = 64,
  height = 20,
  testID = 'sparkline',
}: {
  values: number[];
  width?: number;
  height?: number;
  testID?: string;
}) {
  const theme = useTheme();

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const inset = 2;

  const yFor = (value: number) =>
    span === 0
      ? height / 2
      : inset + (height - inset * 2) * (1 - (value - min) / span);
  const xFor = (index: number) => inset + (index / (values.length - 1)) * (width - inset * 2);

  return (
    <Svg testID={testID} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ')}
        fill="none"
        stroke={theme.primary}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
