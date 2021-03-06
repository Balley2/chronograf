import React, {PropTypes} from 'react';
import AutoRefresh from 'shared/components/AutoRefresh';
import LineGraph from 'shared/components/LineGraph';
import SingleStat from 'shared/components/SingleStat';
import NameableGraph from 'shared/components/NameableGraph';
import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
const GridLayout = WidthProvider(ReactGridLayout);

const RefreshingLineGraph = AutoRefresh(LineGraph);
const RefreshingSingleStat = AutoRefresh(SingleStat);

const {
  arrayOf,
  func,
  number,
  shape,
  string,
} = PropTypes;

export const LayoutRenderer = React.createClass({
  propTypes: {
    autoRefresh: number.isRequired,
    timeRange: shape({
      defaultGroupBy: string.isRequired,
      queryValue: string.isRequired,
    }).isRequired,
    cells: arrayOf(
      shape({
        queries: arrayOf(
          shape({
            label: string,
            range: shape({
              upper: number,
              lower: number,
            }),
            rp: string,
            text: string.isRequired,
            database: string.isRequired,
            groupbys: arrayOf(string),
            wheres: arrayOf(string),
          }).isRequired
        ).isRequired,
        x: number.isRequired,
        y: number.isRequired,
        w: number.isRequired,
        h: number.isRequired,
        i: string.isRequired,
        name: string.isRequired,
      }).isRequired
    ),
    host: string,
    source: string,
    onPositionChange: func,
    onEditCell: func,
    onRenameCell: func,
    onUpdateCell: func,
  },

  buildQuery(q) {
    const {timeRange, host} = this.props;
    const {wheres, groupbys} = q;

    let text = q.text;

    text += ` where time > ${timeRange.queryValue}`;

    if (host) {
      text += ` and \"host\" = '${host}'`;
    }

    if (wheres && wheres.length > 0) {
      text += ` and ${wheres.join(' and ')}`;
    }

    if (groupbys) {
      if (groupbys.find((g) => g.includes("time"))) {
        text += ` group by ${groupbys.join(',')}`;
      } else if (groupbys.length > 0) {
        text += ` group by time(${timeRange.defaultGroupBy}),${groupbys.join(',')}`;
      } else {
        text += ` group by time(${timeRange.defaultGroupBy})`;
      }
    } else {
      text += ` group by time(${timeRange.defaultGroupBy})`;
    }

    return text;
  },

  generateVisualizations() {
    const {autoRefresh, source, cells, onEditCell, onRenameCell, onUpdateCell} = this.props;

    return cells.map((cell) => {
      const qs = cell.queries.map((q) => {
        return Object.assign({}, q, {
          host: source,
          text: this.buildQuery(q),
        });
      });

      if (cell.type === 'single-stat') {
        return (
          <div key={cell.i}>
            <NameableGraph
              onEditCell={onEditCell}
              onRenameCell={onRenameCell}
              onUpdateCell={onUpdateCell}
              cell={cell}
            >
              <RefreshingSingleStat queries={[qs[0]]} autoRefresh={autoRefresh} />
            </NameableGraph>
          </div>
        );
      }

      const displayOptions = {
        stepPlot: cell.type === 'line-stepplot',
        stackedGraph: cell.type === 'line-stacked',
      }

      return (
        <div key={cell.i}>
          <NameableGraph
            onEditCell={onEditCell}
            onRenameCell={onRenameCell}
            onUpdateCell={onUpdateCell}
            cell={cell}
          >
            <RefreshingLineGraph
              queries={qs}
              autoRefresh={autoRefresh}
              showSingleStat={cell.type === "line-plus-single-stat"}
              displayOptions={displayOptions}
            />
          </NameableGraph>
        </div>
      );
    });
  },

  handleLayoutChange(layout) {
    this.triggerWindowResize()

    if (!this.props.onPositionChange) {
      return
    }

    const newCells = this.props.cells.map((cell) => {
      const l = layout.find((ly) => ly.i === cell.i)
      const newLayout = {x: l.x, y: l.y, h: l.h, w: l.w}
      return {...cell, ...newLayout}
    })

    this.props.onPositionChange(newCells)
  },

  render() {
    const layoutMargin = 4
    const isDashboard = !!this.props.onPositionChange

    return (
      <GridLayout
        layout={this.props.cells}
        cols={12}
        rowHeight={83.5}
        margin={[layoutMargin, layoutMargin]}
        containerPadding={[0, 0]}
        useCSSTransforms={false}
        onResize={this.triggerWindowResize}
        onLayoutChange={this.handleLayoutChange}
        draggableHandle={'.dash-graph--heading'}
        isDraggable={isDashboard}
        isResizable={isDashboard}
      >
        {this.generateVisualizations()}
      </GridLayout>
    );
  },


  triggerWindowResize() {
    // Hack to get dygraphs to fit properly during and after resize (dispatchEvent is a global method on window).
    const evt = document.createEvent('CustomEvent');  // MUST be 'CustomEvent'
    evt.initCustomEvent('resize', false, false, null);
    dispatchEvent(evt);
  },
});

export default LayoutRenderer;
