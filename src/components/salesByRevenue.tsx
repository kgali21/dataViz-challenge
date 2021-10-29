import React from 'react';
import { BarStack } from '@visx/shape';
import { Group } from '@visx/group';
import { Grid } from '@visx/grid';
import { AxisBottom, AxisRight } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { timeFormat, timeParse } from 'd3-time-format';
import { useTooltipInPortal, defaultStyles, useTooltip } from '@visx/tooltip';
import { LegendOrdinal } from '@visx/legend';

import salesData from '../data/dataSales.js';

const green = '#71EEB8';
const coral = '#FF7F50';
const blue = '#87CEEB';
const background = 'grey'
const defaultMargins = {
  top: 40,
  right: 0,
  bottom: 0,
  left: 0
};

const toolTipStyles = {
  ...defaultStyles,
  minWidth: 60,
  backgroundColor: "rgba(0,0,0,0.9)",
  color: "white"
}

interface SalesByDate {
    date: string;
    Joe: number;
    Amy: number;
}

interface TooltipData extends SalesByDate {
    bar?: any;
    key?: any;
  }

const data: SalesData[] = salesData;

type SalesData = {
    Date: string;
    "Item Cost": string;
    Product: string;
    Revenue: string;
    Sales: string | number;
    Salesperson: string;
  }

export type BarStackProps = {
    width: number;
    height: number;
    margin?: { top: number, right: number, bottom: number, left:number};
    events?: boolean
}

const dataMassaged = data.map(newObj => {
 const returnObj = ({date: newObj.Date, salesPerson: newObj.Salesperson, revenue: newObj.Revenue.slice(1)})
  return returnObj
}).reduce((a: Array<string>, c: any) => {
  let x = a.find((e: any) => e.date === c.date && e.salesPerson === c.salesPerson);
  if(!x) {
    a.push(Object.assign({}, c))
  } else {
    (x as any).sales = Number(c.revenue) + Number((x as any).revenue)
  }
  return a
}, []).map((newObj: any) => {
  return ({
    date: newObj.date,
    [newObj.salesPerson]: newObj.revenue,
  })
})

interface Accumulator {
    [key: string]: SalesByDate
}

const result: SalesByDate[] = Object.values(dataMassaged.reduce((a: Accumulator, c) => {
    a[c.date] = Object.assign(a[c.date] || {}, c);
    return a;
}, {}))

const keys = Object.values(data.map(newData => newData.Salesperson))
const newKeys = [...new Set(keys)]

const salesTotals = result.map(day => {
    const total = parseInt(day.Amy.toString().replace('$', '')) + parseInt(day.Joe.toString().replace('$', ''))
    return total;
  })

const parseDate = timeParse("%Y-%m-%d");
const format = timeFormat("%b %d");
const formatDate = (date: string) => format(parseDate(date) as Date);

const getDate = (d: SalesByDate) => d.date;

const dateScale = scaleBand<string>({ domain: result.map(getDate), padding: .3 });
const salesScale = scaleLinear<number>({
  domain: [0, Math.max(...salesTotals) * 2],
  nice: true
});
const colorScale = scaleOrdinal<string, string>({
  domain: newKeys,
  range: [green, coral, blue]
});

let tooltipTimeout: number;

const RevenueBarStack = ({ width, height, events = false, margin = defaultMargins }: BarStackProps) => {
  const {
    tooltipOpen,
    tooltipTop,
    tooltipLeft,
    hideTooltip,
    showTooltip,
    tooltipData,
  } = useTooltip<TooltipData>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal();

  if(width < 10) return null;

  const xMax = width;
  const yMax = height - margin.top - 40;

  dateScale.rangeRound([0, xMax]);
  salesScale.rangeRound([yMax, 0]);

  console.log({result, newKeys}, 'resultsNewKeys');

  return width < 10 ? null : (
    <div style={{ position: "relative", left: '2em', top: '2em' }}>
      <svg ref={containerRef} width={width} height={height}>
        <rect 
          x={0}
          y={0}
          width={width}
          height={height}
          fill={background}
          rx={14}
        />
        <Grid 
          top={margin.top}
          left={margin.left}
          xScale={dateScale}
          yScale={salesScale}
          width={xMax}
          height={yMax}
          stroke="black"
          strokeOpacity={.5}
          xOffset={dateScale.bandwidth() / 2}
        />
        <AxisRight scale={salesScale} stroke={"black"} strokeWidth={4} left={.5} label={'Total Revenue'} labelClassName="axisLabel" top={margin.top}/>
        <Group top={margin.top}>
            <BarStack 
              data={result}
              keys={newKeys}
              x={getDate}
              xScale={dateScale}
              yScale={salesScale}
              color={colorScale}
            >
              {
                (barStacks) => 
                  barStacks.map((barStack) => 
                    barStack.bars.map((bar) => {
                      return (
                      <rect 
                        key={`bar-stick-${barStack.index}-${bar.index}`}
                        x={bar.x}
                        y={bar.y}
                        height={bar.height}
                        width={bar.width}
                        fill={bar.color}
                        onClick={() => {
                          if(Event) alert(`Clicked: ${JSON.stringify(bar)}`)
                        }}
                        onMouseLeave={() => {
                          tooltipTimeout = window.setTimeout(() => {
                            hideTooltip();
                          }, 300)
                        }}
                        onMouseMove={(event) => {
                          if (tooltipTimeout) clearTimeout(tooltipTimeout);
                          const top = event.clientY;
                          const left = bar.x;
                          showTooltip({
                            tooltipData: bar,
                            tooltipTop: top,
                            tooltipLeft: left
                          } as any)
                        }}
                      />
                    )})
                  )
              }
          </BarStack>
        </Group>
       <AxisBottom
       top={yMax + margin.top}
       scale={dateScale}
       tickFormat={formatDate}
       stroke={blue}
       tickStroke={blue}
       tickLabelProps={() => ({
         fill: blue,
         fontSize: 11,
         textAnchor: "middle"
       })}
       /> 
      </svg>
      <div style={{
        position: "absolute",
        top: margin.top / 2 - 10,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        fontSize: 14
      }}>
        <LegendOrdinal
          scale={colorScale}
          direction="row"
          labelMargin="0 15px 0 0"
        />
      </div>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal 
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={toolTipStyles}
        >
          <div style={{ color: colorScale(tooltipData.key) }}>
            <strong>{tooltipData.key}</strong>
          </div>
          <div>${tooltipData.bar.data[tooltipData.key]} in Revenue</div>
          <div>
            <small>{formatDate(getDate(tooltipData))}</small>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
};

export default RevenueBarStack;