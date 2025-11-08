import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList
} from 'recharts';
import { Card } from '../UI/Card';

interface ChartProps {
  title: string;
  data: any[];
  type: 'line' | 'pie' | 'bar';
  dataKey?: string | string[];
  xAxisKey?: string;
  colors?: string[];
  layout?: 'horizontal' | 'vertical';
}

const wrapLabelText = (label: string, maxChars = 12): string[] => {
  if (!label) {
    return [''];
  }

  const words = label.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (word.length > maxChars) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      const segments = word.match(new RegExp(`.{1,${maxChars}}`, 'g')) ?? [word];
      if (segments.length) {
        lines.push(...segments.slice(0, -1));
        currentLine = segments[segments.length - 1] ?? '';
      }
      continue;
    }

    if (!currentLine.length) {
      currentLine = word;
      continue;
    }

    if (`${currentLine} ${word}`.length <= maxChars) {
      currentLine = `${currentLine} ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    if (currentLine.length <= maxChars) {
      lines.push(currentLine);
    } else {
      const segments = currentLine.match(new RegExp(`.{1,${maxChars}}`, 'g')) ?? [currentLine];
      lines.push(...segments);
    }
  }

  return lines.length ? lines : [''];
};

const WrappedTick: React.FC<{ x?: number; y?: number; payload?: { value: string } }> = ({ x = 0, y = 0, payload }) => {
  const lines = wrapLabelText(payload?.value ?? '');

  return (
    <text x={x} y={y} textAnchor="middle" fill="#4B5563" fontSize={12}>
      {lines.map((line, index) => (
        <tspan key={`${payload?.value ?? 'line'}-${index}`} x={x} dy={index === 0 ? 0 : 14}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

interface VerticalBarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  label: string;
  count?: number;
  containerWidth?: number;
  plotRightBoundary?: number;
}

const VerticalBarLabel: React.FC<VerticalBarLabelProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  label,
  count,
  containerWidth,
  plotRightBoundary,
}) => {
  const a11yPadding = 8;
  const maxChars = 32;
  const lines = wrapLabelText(label, maxChars);
  const lineHeight = 15;
  const totalLines = count !== undefined ? lines.length + 1 : lines.length;
  const firstLineY = y + height / 2 - ((totalLines - 1) * lineHeight) / 2;

  const barRightEdge = x + width;
  const desiredStart = (plotRightBoundary ?? barRightEdge) + 16;
  const fallbackMax = containerWidth ? containerWidth - a11yPadding : desiredStart + 180;
  const startX = Math.min(desiredStart, fallbackMax);
  const textAnchor: 'start' = 'start';

  return (
    <text x={startX} y={firstLineY} fill="#1F2937" fontSize={12} textAnchor={textAnchor}>
      {lines.map((line, index) => (
        <tspan key={`${label}-${index}`} x={startX} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
      {count !== undefined && (
        <tspan x={startX} dy={lineHeight} fill="#2563EB" fontSize={11} fontWeight={600}>
          {count.toLocaleString('es-ES')} pacientes
        </tspan>
      )}
    </text>
  );
};

export const Chart: React.FC<ChartProps> = ({
  title,
  data,
  type,
  dataKey = 'value',
  xAxisKey = 'name',
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  layout = 'horizontal'
}) => {
  const isVerticalLayout = layout === 'vertical';
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const node = chartContainerRef.current;
    if (!node) {
      return undefined;
    }

    const updateWidth = () => {
      const newWidth = node.getBoundingClientRect().width;
      setContainerWidth(prev => (prev !== newWidth ? newWidth : prev));
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateWidth);
        return () => {
          window.removeEventListener('resize', updateWidth);
        };
      }
      return undefined;
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries.length) {
        return;
      }

      const { width } = entries[0].contentRect;
      setContainerWidth(prev => (prev !== width ? width : prev));
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const labelStrings = useMemo(() => {
    if (!isVerticalLayout || typeof xAxisKey !== 'string') {
      return [] as string[];
    }

    return data.map(item => {
      const raw = item?.[xAxisKey as keyof typeof item];
      return raw === undefined || raw === null ? '' : String(raw);
    });
  }, [data, isVerticalLayout, xAxisKey]);

  const isCompactVertical = isVerticalLayout && containerWidth > 0 && containerWidth < 560;

  const maxLabelLines = useMemo(() => {
    if (!labelStrings.length) {
      return 1;
    }

    const lineCounts = labelStrings.map(label => wrapLabelText(label, isCompactVertical ? 16 : 18).length);
    return lineCounts.length ? Math.max(...lineCounts) : 1;
  }, [labelStrings, isCompactVertical]);

  const maxLabelLength = useMemo(() => {
    if (!labelStrings.length) {
      return 0;
    }

    return labelStrings.reduce((max, label) => Math.max(max, label.length), 0);
  }, [labelStrings]);

  const numericValues =
    isVerticalLayout && typeof dataKey === 'string'
      ? data.map(item => {
          const rawValue = item?.[dataKey as keyof typeof item];
          const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
          return Number.isFinite(numericValue) ? numericValue : 0;
        })
      : [];

  const maxValue = numericValues.length ? Math.max(...numericValues) : 0;
  const xAxisDomain: [number, number] = maxValue > 0 ? [0, maxValue] : [0, 1];
  const xAxisTickCount = maxValue > 0 ? Math.min(6, Math.max(3, Math.ceil(maxValue / Math.max(1, Math.round(maxValue / 6))))) : 2;

  const rows = Array.isArray(data) ? data.length : 0;
  const chartHeight = isVerticalLayout
    ? Math.max(
        rows * (isCompactVertical ? 70 : 46) + (isCompactVertical ? 80 : 48),
        isCompactVertical ? 340 : 260
      )
    : 250;

  const approximateRightMargin = isCompactVertical
    ? Math.min(220, Math.max(48, Math.ceil((maxLabelLength || 6) * 4.8)))
    : Math.min(240, Math.max(140, maxLabelLines * 64));

  const chartMargin = isVerticalLayout
    ? {
        top: 8,
        right: approximateRightMargin,
        left: 12,
        bottom: isCompactVertical ? Math.max(40, maxLabelLines * 18) : 16,
      }
    : { top: 5, right: 20, left: 10, bottom: 60 };

  const barCategoryGap = isVerticalLayout ? (isCompactVertical ? 28 : 18) : undefined;
  const barSize = isVerticalLayout ? (isCompactVertical ? 26 : 18) : undefined;

  const renderChart = () => {
    switch (type) {
      case 'line': {
        const resolvedKeys = Array.isArray(dataKey)
          ? dataKey.filter((key): key is string => typeof key === 'string' && key.length > 0)
          : [dataKey];

        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              {resolvedKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }
      
      case 'pie':
        const resolvedPieKey = Array.isArray(dataKey) ? dataKey[0] : dataKey;
        const pieDataKey = typeof resolvedPieKey === 'string' && resolvedPieKey.length > 0 ? resolvedPieKey : 'value';

        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey={pieDataKey}
                fontSize={10}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar': {
        const resolvedBarKey = Array.isArray(dataKey) ? dataKey[0] : dataKey;
        const barDataKey = typeof resolvedBarKey === 'string' && resolvedBarKey.length > 0 ? resolvedBarKey : 'value';

        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={data}
              layout={isVerticalLayout ? 'vertical' : 'horizontal'}
              margin={chartMargin}
              barCategoryGap={barCategoryGap}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={!isVerticalLayout} vertical={isVerticalLayout} />
              {isVerticalLayout ? (
                <XAxis
                  type="number"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={xAxisDomain}
                  tickCount={xAxisTickCount}
                />
              ) : (
                <XAxis
                  dataKey={xAxisKey}
                  fontSize={12}
                  interval={0}
                  tickLine={false}
                  tick={<WrappedTick />}
                />
              )}
              {isVerticalLayout ? (
                <YAxis
                  type="category"
                  dataKey={xAxisKey}
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  width={0}
                />
              ) : (
                <YAxis fontSize={12} />
              )}
              <Tooltip />
              <Bar
                dataKey={barDataKey}
                fill={colors[0]}
                radius={isVerticalLayout ? [4, 4, 4, 4] : 0}
                barSize={barSize}
              >
                {isVerticalLayout && (
                  <LabelList
                    dataKey={xAxisKey}
                    position="right"
                    content={(props: any) => {
                      const {
                        x = 0,
                        y = 0,
                        width = 0,
                        height = 0,
                        value,
                        payload,
                      } = props ?? {};

                      const labelValue = value === undefined || value === null ? '' : String(value);
                      const countRaw = payload?.[barDataKey];
                      const parsedCount =
                        typeof countRaw === 'number'
                          ? countRaw
                          : typeof countRaw === 'string'
                          ? Number(countRaw)
                          : undefined;
                      const countValue = Number.isFinite(parsedCount ?? NaN) ? (parsedCount as number) : undefined;

                      return (
                        <VerticalBarLabel
                          x={typeof x === 'number' ? x : Number(x) || 0}
                          y={typeof y === 'number' ? y : Number(y) || 0}
                          width={typeof width === 'number' ? width : Number(width) || 0}
                          height={typeof height === 'number' ? height : Number(height) || 0}
                          label={labelValue}
                          count={countValue}
                          containerWidth={containerWidth}
                        />
                      );
                    }}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <Card>
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">{title}</h3>
      <div ref={chartContainerRef} className="w-full">
        {renderChart()}
      </div>
    </Card>
  );
};