/**
 * Meta-Analysis Visualization Module
 * Forest plot, Funnel plot, Galbraith plot, L'Abbe plot, etc.
 * All plots use SVG for crisp, scalable rendering
 */

const Plots = (function () {
  'use strict';

  // SVG namespace
  const NS = 'http://www.w3.org/2000/svg';

  function createSVG(w, h, viewBox) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    if (viewBox) svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('xmlns', NS);
    return svg;
  }

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        e.setAttribute(k, v);
      }
    }
    return e;
  }

  function elText(text, attrs) {
    const t = el('text', attrs);
    t.textContent = text;
    return t;
  }

  // Helper: format number
  function fmt(x, d = 2) {
    if (!isFinite(x)) return '-';
    if (Math.abs(x) < 0.001 && x !== 0) return x.toExponential(1);
    return x.toFixed(d);
  }

  function fmtP(p) {
    if (p < 0.001) return '< 0.001';
    return p.toFixed(3);
  }

  // ============================================================
  // Forest Plot
  // ============================================================

  /**
   * Render a forest plot
   * @param {Object} container - DOM element
   * @param {Array} studies - study data with TE, seTE, label
   * @param {Object} pooled - pooled result { TE, seTE, lower, upper, model }
   * @param {Object} opts - { measure, showWeights, expScale, studyNames }
   */
  function forestPlot(container, studies, pooled, opts = {}) {
    container.innerHTML = '';

    const measure = opts.measure || 'MD';
    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(measure);
    const showWeights = opts.showWeights !== false;
    const studyNames = opts.studyNames || studies.map((_, i) => 'Study ' + (i + 1));
    const showSubgroups = opts.subgroups || false;

    // Transform function for display
    const transform = (x) => expScale ? Math.exp(x) : x;
    const transformCI = (lo, hi) => expScale ? [Math.exp(lo), Math.exp(hi)] : [lo, hi];

    // Compute data range
    let allTE = studies.map(s => s.TE);
    let allLower = studies.map(s => s.TE - 1.96 * s.seTE);
    let allUpper = studies.map(s => s.TE + 1.96 * s.seTE);
    if (pooled) {
      allTE.push(pooled.TE);
      allLower.push(pooled.lower);
      allUpper.push(pooled.upper);
    }
    const dataMin = Math.min(...allLower);
    const dataMax = Math.max(...allUpper);
    const padding = (dataMax - dataMin) * 0.1;
    const xMin = dataMin - padding;
    const xMax = dataMax + padding;

    // Layout constants
    const studyArea = studies.length;
    const hasPooled = pooled ? 2 : 0;
    const totalRows = studyArea + hasPooled + (showSubgroups ? 2 : 1);

    const leftMargin = 250;
    const rightMargin = showWeights ? 180 : 100;
    const topMargin = 50;
    const bottomMargin = 60;
    const rowHeight = 32;
    const plotWidth = 900;
    const plotHeight = topMargin + bottomMargin + totalRows * rowHeight;

    const svg = createSVG(plotWidth, plotHeight);
    container.appendChild(svg);

    // Scales
    const plotW = plotWidth - leftMargin - rightMargin;
    const xScale = (x) => leftMargin + ((x - xMin) / (xMax - xMin)) * plotW;
    const yScale = (row) => topMargin + row * rowHeight + rowHeight / 2;

    // Background
    svg.appendChild(el('rect', {
      x: 0, y: 0, width: plotWidth, height: plotHeight,
      fill: '#ffffff'
    }));

    // Column headers
    svg.appendChild(elText('Study', {
      x: 10, y: topMargin - 20,
      'font-size': 12, 'font-weight': 'bold', fill: '#333'
    }));

    const effectLabel = expScale
      ? `${measure} [95% CI]`
      : (measure === 'SMD' ? 'SMD [95% CI]' : measure === 'MD' ? 'MD [95% CI]' : 'Effect [95% CI]');

    svg.appendChild(elText(effectLabel, {
      x: leftMargin + plotW / 2, y: topMargin - 20,
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 'bold', fill: '#333'
    }));

    if (showWeights) {
      svg.appendChild(elText('Weight', {
        x: plotWidth - rightMargin + 80, y: topMargin - 20,
        'text-anchor': 'middle', 'font-size': 12, 'font-weight': 'bold', fill: '#333'
      }));
    }

    // X-axis ticks
    const nTicks = 6;
    const tickValues = [];
    for (let i = 0; i <= nTicks; i++) {
      const v = xMin + (i / nTicks) * (xMax - xMin);
      tickValues.push(v);
    }

    // Grid lines and x-axis labels
    for (const tv of tickValues) {
      const xPos = xScale(tv);

      // Grid line
      svg.appendChild(el('line', {
        x1: xPos, y1: topMargin,
        x2: xPos, y2: plotHeight - bottomMargin,
        stroke: '#e0e0e0', 'stroke-width': 1, 'stroke-dasharray': '3,3'
      }));

      // Tick label (transformed)
      const displayVal = transform(tv);
      svg.appendChild(elText(fmt(displayVal, 2), {
        x: xPos, y: plotHeight - bottomMargin + 20,
        'text-anchor': 'middle', 'font-size': 10, fill: '#666'
      }));
    }

    // Null line (effect = 0 on log scale, or 1 on exp scale)
    const nullX = xScale(0);
    if (nullX >= leftMargin && nullX <= plotWidth - rightMargin) {
      svg.appendChild(el('line', {
        x1: nullX, y1: topMargin,
        x2: nullX, y2: plotHeight - bottomMargin,
        stroke: '#999', 'stroke-width': 1.5, 'stroke-dasharray': '5,5'
      }));
    }

    // Axis line
    svg.appendChild(el('line', {
      x1: leftMargin, y1: plotHeight - bottomMargin,
      x2: plotWidth - rightMargin, y2: plotHeight - bottomMargin,
      stroke: '#333', 'stroke-width': 1.5
    }));

    // Draw studies
    let currentRow = 0;
    studies.forEach((study, i) => {
      const y = yScale(currentRow);
      const name = studyNames[i] || `Study ${i + 1}`;

      // Subgroup label if needed
      if (showSubgroups && study.subgroup) {
        // Subgroup header row
        svg.appendChild(el('rect', {
          x: 5, y: y - rowHeight / 2 + 2,
          width: plotWidth - 10, height: rowHeight - 4,
          fill: '#f0f4f8', 'stroke': 'none'
        }));
        svg.appendChild(elText(study.subgroup, {
          x: 15, y: y + 4,
          'font-size': 12, 'font-weight': 'bold', fill: '#2c3e50'
        }));
        currentRow++;
        return;
      }

      // Study name
      const nameEl = elText(name, {
        x: 15, y: y + 4,
        'font-size': 11, fill: '#333'
      });
      // Truncate if too long
      if (name.length > 28) {
        nameEl.textContent = name.substring(0, 25) + '...';
      }
      svg.appendChild(nameEl);

      // Effect size and CI
      const te = study.TE;
      const lower = te - 1.96 * study.seTE;
      const upper = te + 1.96 * study.seTE;

      // Clip to plot area
      const xLeft = xScale(Math.max(lower, xMin));
      const xRight = xScale(Math.min(upper, xMax));
      const xCenter = xScale(te);

      // CI line
      svg.appendChild(el('line', {
        x1: xLeft, y1: y,
        x2: xRight, y2: y,
        stroke: '#4a90d9', 'stroke-width': 1.5
      }));

      // CI caps
      svg.appendChild(el('line', {
        x1: xLeft, y1: y - 4,
        x2: xLeft, y2: y + 4,
        stroke: '#4a90d9', 'stroke-width': 1.5
      }));
      svg.appendChild(el('line', {
        x1: xRight, y1: y - 4,
        x2: xRight, y2: y + 4,
        stroke: '#4a90d9', 'stroke-width': 1.5
      }));

      // Study point - box sized by weight
      let boxSize = 8;
      if (pooled && pooled.weightsPct && pooled.weightsPct[i] !== undefined) {
        boxSize = 4 + (pooled.weightsPct[i] / 100) * 16;
      }
      svg.appendChild(el('rect', {
        x: xCenter - boxSize / 2,
        y: y - boxSize / 2,
        width: boxSize, height: boxSize,
        fill: '#2c3e50', 'stroke': '#1a252f', 'stroke-width': 0.5
      }));

      // Right side: effect estimate and CI
      const [dispTE, dispLo, dispHi] = [transform(te), ...transformCI(lower, upper)];
      const ciText = `${fmt(dispTE)} [${fmt(dispLo)}, ${fmt(dispHi)}]`;
      svg.appendChild(elText(ciText, {
        x: plotWidth - rightMargin + 10, y: y + 4,
        'font-size': 10, fill: '#333'
      }));

      // Weight
      if (showWeights && pooled && pooled.weightsPct && pooled.weightsPct[i] !== undefined) {
        svg.appendChild(elText(pooled.weightsPct[i].toFixed(1) + '%', {
          x: plotWidth - rightMargin + 140, y: y + 4,
          'font-size': 10, fill: '#666', 'text-anchor': 'right'
        }));
      }

      currentRow++;
    });

    // Pooled estimate
    if (pooled) {
      currentRow++; // Spacer row

      // Horizontal line separator
      svg.appendChild(el('line', {
        x1: 5, y1: yScale(currentRow) - rowHeight / 2,
        x2: plotWidth - 5, y2: yScale(currentRow) - rowHeight / 2,
        stroke: '#333', 'stroke-width': 1
      }));

      const y = yScale(currentRow);
      const label = pooled.model === 'random'
        ? `Subtotal (Random, tau2=${fmt(pooled.tau2 || 0, 4)}, I2=${fmt(pooled.I2 || 0, 1)}%)`
        : `Subtotal (Fixed)`;

      svg.appendChild(elText(label, {
        x: 15, y: y + 4,
        'font-size': 11, 'font-weight': 'bold', fill: '#2c3e50'
      }));

      // Diamond for pooled estimate
      const xCenter = xScale(pooled.TE);
      const xLeft = xScale(pooled.lower);
      const xRight = xScale(pooled.upper);
      const diamondH = 12;

      svg.appendChild(el('polygon', {
        points: `${xCenter},${y - diamondH} ${xRight},${y} ${xCenter},${y + diamondH} ${xLeft},${y}`,
        fill: '#e74c3c', 'fill-opacity': 0.7,
        stroke: '#c0392b', 'stroke-width': 1
      }));

      // Pooled estimate text
      const [dispTE, dispLo, dispHi] = [transform(pooled.TE), ...transformCI(pooled.lower, pooled.upper)];
      const ciText = `${fmt(dispTE)} [${fmt(dispLo)}, ${fmt(dispHi)}]`;
      svg.appendChild(elText(ciText, {
        x: plotWidth - rightMargin + 10, y: y + 4,
        'font-size': 10, 'font-weight': 'bold', fill: '#333'
      }));

      // Weight column shows I2 or N/A
      if (showWeights) {
        svg.appendChild(elText('-', {
          x: plotWidth - rightMargin + 140, y: y + 4,
          'font-size': 10, fill: '#666'
        }));
      }

      currentRow++;
    }

    // Heterogeneity info at bottom
    if (pooled && pooled.Q !== undefined) {
      const infoY = plotHeight - 25;
      const hetText = `Heterogeneity: tau2 = ${fmt(pooled.tau2 || 0, 4)}; chi2 = ${fmt(pooled.Q, 2)}, df = ${pooled.df} (P ${pooled.Q_p < 0.001 ? '< 0.001' : '= ' + fmt(pooled.Q_p, 3)}); I2 = ${fmt(pooled.I2, 1)}%`;
      svg.appendChild(elText(hetText, {
        x: 15, y: infoY,
        'font-size': 10, fill: '#555', 'font-style': 'italic'
      }));

      if (pooled.z !== undefined) {
        const testText = `Test for overall effect: Z = ${fmt(pooled.z, 2)} (P ${pooled.p < 0.001 ? '< 0.001' : '= ' + fmt(pooled.p, 3)})`;
        svg.appendChild(elText(testText, {
          x: 450, y: infoY,
          'font-size': 10, fill: '#555', 'font-style': 'italic'
        }));
      }
    }

    // Axis label
    const axisLabel = expScale ? `${measure} (log scale)` : 'Effect Size';
    svg.appendChild(elText(`Favors treatment  <---  ${axisLabel}  --->  Favors control`, {
      x: leftMargin + plotW / 2, y: plotHeight - 8,
      'text-anchor': 'middle', 'font-size': 10, fill: '#888'
    }));
  }

  // ============================================================
  // Funnel Plot
  // ============================================================

  function funnelPlot(container, studies, pooled, opts = {}) {
    container.innerHTML = '';

    const measure = opts.measure || 'MD';
    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(measure);
    const showTrimFill = opts.trimFill || false;
    const trimFillResult = opts.trimFillResult || null;
    const showEgger = opts.egger || false;
    const eggerResult = opts.eggerResult || null;

    const valid = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (valid.length === 0) return;

    const transform = (x) => expScale ? Math.exp(x) : x;
    const seTransform = opts.seTransform || 'se'; // 'se' or 'precision' (1/SE)

    // Data range
    const allTE = valid.map(s => s.TE);
    const allSE = valid.map(s => s.seTE);
    const maxSE = Math.max(...allSE);
    const minTE = Math.min(...allTE);
    const maxTE = Math.max(...allTE);
    const pooledTE = pooled ? pooled.TE : (allTE.reduce((a, b) => a + b, 0) / valid.length);

    // Add pseudo CI range to x
    const xRange = Math.max(maxTE - minTE, 2 * 1.96 * maxSE) * 0.6;
    const xMin = pooledTE - xRange;
    const xMax = pooledTE + xRange;

    // Layout
    const W = 600, H = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    // Scales
    // Y axis: 1/SE (precision) or SE
    const usePrecision = opts.yAxis === 'precision';
    const yMin = usePrecision ? 0 : maxSE * 1.1;
    const yMax = usePrecision ? (1 / Math.min(...allSE)) * 1.1 : 0;

    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotW;
    const yScale = (val) => {
      if (usePrecision) {
        return margin.top + plotH - (val / yMax) * plotH;
      } else {
        return margin.top + (val / yMax) * plotH;
      }
    };

    // Background
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));

    // Title
    svg.appendChild(elText('Funnel Plot', {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    // Plot area border
    svg.appendChild(el('rect', {
      x: margin.left, y: margin.top,
      width: plotW, height: plotH,
      fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1
    }));

    // Pseudo 95% CI lines
    const seValues = usePrecision ? allSE.map(s => 1 / s) : allSE;
    const maxVal = usePrecision ? Math.max(...seValues) : yMax;

    // Draw CI lines from (pooledTE, 0) outward
    for (const [mult, color, label] of [[1.96, '#aaa', '95% CI'], [2.576, '#ddd', '99% CI']]) {
      // Left line: from (pooledTE, 0) to (pooledTE - mult*maxSE, maxSE)
      const x1 = xScale(pooledTE);
      const y1 = usePrecision ? yScale(0) : yScale(0);
      const x2_left = xScale(pooledTE - mult * maxSE);
      const x2_right = xScale(pooledTE + mult * maxSE);
      const y2 = usePrecision ? yScale(1 / maxSE) : yScale(maxSE);

      svg.appendChild(el('line', {
        x1, y1, x2: x2_left, y2,
        stroke: color, 'stroke-width': 1, 'stroke-dasharray': '4,4'
      }));
      svg.appendChild(el('line', {
        x1, y1, x2: x2_right, y2,
        stroke: color, 'stroke-width': 1, 'stroke-dasharray': '4,4'
      }));
    }

    // Vertical line at pooled estimate
    svg.appendChild(el('line', {
      x1: xScale(pooledTE), y1: margin.top,
      x2: xScale(pooledTE), y2: margin.top + plotH,
      stroke: '#e74c3c', 'stroke-width': 1.5, 'stroke-dasharray': '5,5'
    }));

    // Trim and fill points
    if (showTrimFill && trimFillResult && trimFillResult.filledStudies) {
      for (const s of trimFillResult.filledStudies) {
        svg.appendChild(el('circle', {
          cx: xScale(s.TE), cy: yScale(usePrecision ? 1 / s.seTE : s.seTE),
          r: 4, fill: '#9b59b6', 'fill-opacity': 0.5,
          stroke: '#8e44ad', 'stroke-width': 1
        }));
      }
      // Adjusted estimate line
      svg.appendChild(el('line', {
        x1: xScale(trimFillResult.adjustedTE), y1: margin.top,
        x2: xScale(trimFillResult.adjustedTE), y2: margin.top + plotH,
        stroke: '#9b59b6', 'stroke-width': 1.5, 'stroke-dasharray': '3,3'
      }));
    }

    // Egger regression line
    if (showEgger && eggerResult) {
      const xs = eggerResult.x; // 1/SE
      const ys = eggerResult.fitted; // predicted Z

      // Convert back: TE = Z * SE, SE = 1/(1/SE)
      const points = xs.map((precision, i) => {
        const se = 1 / precision;
        const te = ys[i] * se;
        return { x: xScale(te), y: yScale(usePrecision ? precision : se) };
      });

      if (points.length >= 2) {
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          pathD += ` L ${points[i].x} ${points[i].y}`;
        }
        svg.appendChild(el('path', {
          d: pathD,
          fill: 'none', stroke: '#27ae60', 'stroke-width': 2
        }));
      }
    }

    // Study points
    for (const s of valid) {
      svg.appendChild(el('circle', {
        cx: xScale(s.TE),
        cy: yScale(usePrecision ? 1 / s.seTE : s.seTE),
        r: 5, fill: '#3498db', 'fill-opacity': 0.6,
        stroke: '#2980b9', 'stroke-width': 1
      }));
    }

    // Axes
    // X-axis
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top + plotH,
      x2: margin.left + plotW, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));
    // X-axis ticks
    const nXTicks = 5;
    for (let i = 0; i <= nXTicks; i++) {
      const xv = xMin + (i / nXTicks) * (xMax - xMin);
      const xPos = xScale(xv);
      svg.appendChild(el('line', {
        x1: xPos, y1: margin.top + plotH,
        x2: xPos, y2: margin.top + plotH + 5,
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(transform(xv), 1), {
        x: xPos, y: margin.top + plotH + 18,
        'text-anchor': 'middle', 'font-size': 10, fill: '#555'
      }));
    }

    // Y-axis
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));
    // Y-axis ticks
    const nYTicks = 5;
    for (let i = 0; i <= nYTicks; i++) {
      const ratio = i / nYTicks;
      let yVal;
      if (usePrecision) {
        yVal = ratio * yMax;
        svg.appendChild(el('line', {
          x1: margin.left - 5, y1: yScale(yVal),
          x2: margin.left, y2: yScale(yVal),
          stroke: '#333', 'stroke-width': 1
        }));
        svg.appendChild(elText(fmt(yVal, 2), {
          x: margin.left - 8, y: yScale(yVal) + 3,
          'text-anchor': 'end', 'font-size': 10, fill: '#555'
        }));
      } else {
        yVal = ratio * yMax;
        svg.appendChild(el('line', {
          x1: margin.left - 5, y1: yScale(yVal),
          x2: margin.left, y2: yScale(yVal),
          stroke: '#333', 'stroke-width': 1
        }));
        svg.appendChild(elText(fmt(yVal, 3), {
          x: margin.left - 8, y: yScale(yVal) + 3,
          'text-anchor': 'end', 'font-size': 10, fill: '#555'
        }));
      }
    }

    // Axis labels
    svg.appendChild(elText(transform(pooledTE) > 0 ? `Effect (${measure})` : `Effect (${measure})`, {
      x: margin.left + plotW / 2, y: H - 15,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333'
    }));

    const yLabel = usePrecision ? 'Precision (1/SE)' : 'Standard Error';
    svg.appendChild(elText(yLabel, {
      x: 15, y: margin.top + plotH / 2,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333',
      transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
    }));

    // Legend
    let legendX = margin.left + plotW - 120;
    let legendY = margin.top + 15;
    svg.appendChild(el('rect', {
      cx: legendX, cy: legendY, x: legendX, y: legendY - 5,
      width: 110, height: 60,
      fill: 'rgba(255,255,255,0.85)', stroke: '#ccc', 'stroke-width': 0.5
    }));
    svg.appendChild(el('circle', {
      cx: legendX + 8, cy: legendY + 5, r: 4,
      fill: '#3498db', 'fill-opacity': 0.6, stroke: '#2980b9', 'stroke-width': 1
    }));
    svg.appendChild(elText('Study', {
      x: legendX + 18, y: legendY + 8, 'font-size': 9, fill: '#555'
    }));
    svg.appendChild(el('line', {
      x1: legendX + 2, y1: legendY + 20,
      x2: legendX + 14, y2: legendY + 20,
      stroke: '#e74c3c', 'stroke-width': 1.5, 'stroke-dasharray': '5,5'
    }));
    svg.appendChild(elText('Pooled', {
      x: legendX + 18, y: legendY + 23, 'font-size': 9, fill: '#555'
    }));
    svg.appendChild(el('line', {
      x1: legendX + 2, y1: legendY + 35,
      x2: legendX + 14, y2: legendY + 35,
      stroke: '#aaa', 'stroke-width': 1, 'stroke-dasharray': '4,4'
    }));
    svg.appendChild(elText('95% CI', {
      x: legendX + 18, y: legendY + 38, 'font-size': 9, fill: '#555'
    }));
  }

  // ============================================================
  // Galbraith (Radial) Plot
  // ============================================================

  function galbraithPlot(container, studies, pooled) {
    container.innerHTML = '';

    const valid = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (valid.length < 2) return;

    const W = 600, H = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    // z = TE / SE (y-axis), 1/SE (x-axis)
    const z = valid.map(s => s.TE / s.seTE);
    const invSE = valid.map(s => 1 / s.seTE);

    const xMax = Math.max(...invSE) * 1.1;
    const zMax = Math.max(Math.max(...z), Math.abs(Math.min(...z))) * 1.2;
    const zMin = -zMax;

    const xScale = (x) => margin.left + (x / xMax) * plotW;
    const yScale = (y) => margin.top + plotH - ((y - zMin) / (zMax - zMin)) * plotH;

    // Background
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));

    // Title
    svg.appendChild(elText('Galbraith (Radial) Plot', {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    // Plot area
    svg.appendChild(el('rect', {
      x: margin.left, y: margin.top, width: plotW, height: plotH,
      fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1
    }));

    // Horizontal axis (z = 0)
    svg.appendChild(el('line', {
      x1: margin.left, y1: yScale(0),
      x2: margin.left + plotW, y2: yScale(0),
      stroke: '#333', 'stroke-width': 1
    }));

    // Vertical axis
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));

    // Regression line (pooled estimate)
    const pooledTE = pooled ? pooled.TE : valid.reduce((sum, s) => sum + s.TE, 0) / valid.length;
    const slope = pooledTE;

    // Draw regression line through origin with slope = pooledTE
    const x1 = 0, y1 = slope * 0;
    const x2 = xMax, y2 = slope * xMax;
    svg.appendChild(el('line', {
      x1: xScale(x1), y1: yScale(y1),
      x2: xScale(x2), y2: yScale(y2),
      stroke: '#e74c3c', 'stroke-width': 2
    }));

    // 95% CI lines (±2 in z)
    for (const offset of [-2, 2]) {
      svg.appendChild(el('line', {
        x1: xScale(0), y1: yScale(offset),
        x2: xScale(xMax), y2: yScale(offset + slope * xMax),
        stroke: '#aaa', 'stroke-width': 1, 'stroke-dasharray': '4,4'
      }));
    }

    // Study points
    for (let i = 0; i < valid.length; i++) {
      svg.appendChild(el('circle', {
        cx: xScale(invSE[i]),
        cy: yScale(z[i]),
        r: 5, fill: '#3498db', 'fill-opacity': 0.7,
        stroke: '#2980b9', 'stroke-width': 1
      }));
    }

    // X-axis ticks
    for (let i = 0; i <= 5; i++) {
      const xv = (i / 5) * xMax;
      svg.appendChild(el('line', {
        x1: xScale(xv), y1: margin.top + plotH,
        x2: xScale(xv), y2: margin.top + plotH + 5,
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(xv, 1), {
        x: xScale(xv), y: margin.top + plotH + 18,
        'text-anchor': 'middle', 'font-size': 10, fill: '#555'
      }));
    }

    // Y-axis ticks
    for (let i = 0; i <= 6; i++) {
      const zv = zMin + (i / 6) * (zMax - zMin);
      svg.appendChild(el('line', {
        x1: margin.left - 5, y1: yScale(zv),
        x2: margin.left, y2: yScale(zv),
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(zv, 1), {
        x: margin.left - 8, y: yScale(zv) + 3,
        'text-anchor': 'end', 'font-size': 10, fill: '#555'
      }));
    }

    // Axis labels
    svg.appendChild(elText('1 / SE (Precision)', {
      x: margin.left + plotW / 2, y: H - 15,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333'
    }));
    svg.appendChild(elText('z = Effect / SE', {
      x: 15, y: margin.top + plotH / 2,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333',
      transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
    }));
  }

  // ============================================================
  // L'Abbe Plot
  // ============================================================

  function labbePlot(container, studies, pooled, measure) {
    container.innerHTML = '';

    // Only for binary outcomes
    const valid = studies.filter(s =>
      s.events_t !== undefined && s.events_c !== undefined &&
      s.total_t !== undefined && s.total_c !== undefined
    );
    if (valid.length < 2) return;

    const W = 550, H = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    const scale = (v) => margin.left + v * plotW;
    const scaleY = (v) => margin.top + plotH - v * plotH;

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
    svg.appendChild(elText("L'Abbe Plot", {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    // Plot area
    svg.appendChild(el('rect', {
      x: margin.left, y: margin.top, width: plotW, height: plotH,
      fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1
    }));

    // Equality line
    svg.appendChild(el('line', {
      x1: scale(0), y1: scaleY(0),
      x2: scale(1), y2: scaleY(1),
      stroke: '#aaa', 'stroke-width': 1.5, 'stroke-dasharray': '5,5'
    }));

    // Pooled effect line
    if (pooled) {
      const pooledRiskRatio = measure === 'RR' && pooled.TE ? Math.exp(pooled.TE) : null;
      if (pooledRiskRatio) {
        // RR = Rt/Rc => Rt = RR * Rc
        const x1 = 0.01, y1 = pooledRiskRatio * 0.01;
        const x2 = 1, y2 = Math.min(1, pooledRiskRatio);
        if (y1 <= 1) {
          svg.appendChild(el('line', {
            x1: scale(x1), y1: scaleY(y1),
            x2: scale(x2), y2: scaleY(y2),
            stroke: '#e74c3c', 'stroke-width': 2
          }));
        }
      }
    }

    // Study points
    for (const s of valid) {
      const rt = s.events_t / s.total_t;
      const rc = s.events_c / s.total_c;
      const n = Math.sqrt(s.total_t + s.total_c);
      svg.appendChild(el('circle', {
        cx: scale(rc), cy: scaleY(rt),
        r: Math.max(3, n / 3),
        fill: '#3498db', 'fill-opacity': 0.5,
        stroke: '#2980b9', 'stroke-width': 1
      }));
    }

    // Axes
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top + plotH,
      x2: margin.left + plotW, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));

    for (let i = 0; i <= 5; i++) {
      const v = i / 5;
      svg.appendChild(el('line', {
        x1: scale(v), y1: margin.top + plotH,
        x2: scale(v), y2: margin.top + plotH + 5,
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(v, 1), {
        x: scale(v), y: margin.top + plotH + 18,
        'text-anchor': 'middle', 'font-size': 10, fill: '#555'
      }));
      svg.appendChild(el('line', {
        x1: margin.left - 5, y1: scaleY(v),
        x2: margin.left, y2: scaleY(v),
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(v, 1), {
        x: margin.left - 8, y: scaleY(v) + 3,
        'text-anchor': 'end', 'font-size': 10, fill: '#555'
      }));
    }

    svg.appendChild(elText('Event Rate (Control)', {
      x: margin.left + plotW / 2, y: H - 15,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333'
    }));
    svg.appendChild(elText('Event Rate (Treatment)', {
      x: 15, y: margin.top + plotH / 2,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333',
      transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
    }));
  }

  // ============================================================
  // Baujat Plot
  // ============================================================

  function baujatPlot(container, studies, pooled, model, tau2Method) {
    container.innerHTML = '';

    const valid = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (valid.length < 3) return;

    const W = 550, H = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 70 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    // Compute contribution to heterogeneity (x) and to pooled effect (y)
    const contributions = valid.map((s, i) => {
      const remaining = valid.filter((_, j) => j !== i);
      const remainingResult = model === 'random'
        ? Stats.randomEffect(remaining, tau2Method)
        : Stats.fixedEffect(remaining);
      const pooledTE = pooled.TE;
      const withoutTE = remainingResult.TE;
      const contribEffect = (pooledTE - withoutTE) * s.TE; // contribution to overall effect
      const contribHet = (s.TE - pooledTE) * (s.TE - pooledTE) / (s.seTE * s.seTE); // contribution to Q
      return { x: contribHet, y: contribEffect, study: s, index: i };
    });

    const xMax = Math.max(...contributions.map(c => c.x)) * 1.1 || 1;
    const yVals = contributions.map(c => c.y);
    const yMax = Math.max(...yVals.map(Math.abs)) * 1.2 || 1;

    const xScale = (x) => margin.left + (x / xMax) * plotW;
    const yScale = (y) => margin.top + plotH / 2 - (y / yMax) * (plotH / 2);

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
    svg.appendChild(elText('Baujat Plot', {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    svg.appendChild(el('rect', {
      x: margin.left, y: margin.top, width: plotW, height: plotH,
      fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1
    }));

    // Axes
    svg.appendChild(el('line', {
      x1: margin.left, y1: yScale(0),
      x2: margin.left + plotW, y2: yScale(0),
      stroke: '#333', 'stroke-width': 1
    }));
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));

    // Points
    contributions.forEach((c, i) => {
      svg.appendChild(el('circle', {
        cx: xScale(c.x), cy: yScale(c.y),
        r: 6, fill: '#3498db', 'fill-opacity': 0.7,
        stroke: '#2980b9', 'stroke-width': 1
      }));
      svg.appendChild(elText(String(i + 1), {
        x: xScale(c.x) + 8, y: yScale(c.y) - 5,
        'font-size': 9, fill: '#555'
      }));
    });

    // Axis labels
    svg.appendChild(elText('Contribution to Heterogeneity (Q)', {
      x: margin.left + plotW / 2, y: H - 15,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333'
    }));
    svg.appendChild(elText('Contribution to Pooled Effect', {
      x: 15, y: margin.top + plotH / 2,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333',
      transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
    }));
  }

  // ============================================================
  // Sensitivity Plot (Leave-one-out)
  // ============================================================

  function sensitivityPlot(container, looResults, pooled, measure) {
    container.innerHTML = '';

    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(measure);
    const transform = (x) => expScale ? Math.exp(x) : x;

    const W = 800, H = Math.max(300, looResults.length * 28 + 80);
    const margin = { top: 40, right: 100, bottom: 50, left: 200 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    // Data range
    const allTE = looResults.map(r => r.TE);
    const allLower = looResults.map(r => r.lower);
    const allUpper = looResults.map(r => r.upper);
    if (pooled) {
      allTE.push(pooled.TE);
      allLower.push(pooled.lower);
      allUpper.push(pooled.upper);
    }

    const dataMin = Math.min(...allLower);
    const dataMax = Math.max(...allUpper);
    const padding = (dataMax - dataMin) * 0.1;
    const xMin = dataMin - padding;
    const xMax = dataMax + padding;

    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotW;
    const rowH = plotH / looResults.length;
    const yScale = (i) => margin.top + i * rowH + rowH / 2;

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
    svg.appendChild(elText('Leave-One-Out Sensitivity Analysis', {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    // Null line
    const nullX = xScale(0);
    svg.appendChild(el('line', {
      x1: nullX, y1: margin.top,
      x2: nullX, y2: margin.top + plotH,
      stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '5,5'
    }));

    // Pooled estimate reference
    if (pooled) {
      svg.appendChild(el('rect', {
        x: xScale(pooled.lower), y: margin.top,
        width: xScale(pooled.upper) - xScale(pooled.lower),
        height: plotH,
        fill: '#fdecea', 'fill-opacity': 0.5
      }));
      svg.appendChild(el('line', {
        x1: xScale(pooled.TE), y1: margin.top,
        x2: xScale(pooled.TE), y2: margin.top + plotH,
        stroke: '#e74c3c', 'stroke-width': 1, 'stroke-dasharray': '3,3'
      }));
    }

    // X-axis
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top + plotH,
      x2: margin.left + plotW, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1
    }));

    for (let i = 0; i <= 5; i++) {
      const v = xMin + (i / 5) * (xMax - xMin);
      svg.appendChild(el('line', {
        x1: xScale(v), y1: margin.top + plotH,
        x2: xScale(v), y2: margin.top + plotH + 5,
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(transform(v), 2), {
        x: xScale(v), y: margin.top + plotH + 18,
        'text-anchor': 'middle', 'font-size': 10, fill: '#555'
      }));
    }

    // Rows
    looResults.forEach((r, i) => {
      const y = yScale(i);
      const label = r.excluded.label || r.excluded.name || `Study ${i + 1}`;

      svg.appendChild(elText(`Omit ${label}`, {
        x: 10, y: y + 4,
        'font-size': 10, fill: '#333'
      }));

      const xLeft = xScale(r.lower);
      const xRight = xScale(r.upper);
      const xCenter = xScale(r.TE);

      svg.appendChild(el('line', {
        x1: xLeft, y1: y, x2: xRight, y2: y,
        stroke: '#4a90d9', 'stroke-width': 1.5
      }));
      svg.appendChild(el('rect', {
        x: xCenter - 4, y: y - 4, width: 8, height: 8,
        fill: '#2c3e50', stroke: '#1a252f', 'stroke-width': 0.5
      }));

      const ciText = `${fmt(transform(r.TE))} [${fmt(transform(r.lower))}, ${fmt(transform(r.upper))}]`;
      svg.appendChild(elText(ciText, {
        x: margin.left + plotW + 10, y: y + 4,
        'font-size': 9, fill: '#333'
      }));
    });

    // Axis label
    svg.appendChild(elText(`Effect (${measure})`, {
      x: margin.left + plotW / 2, y: H - 10,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333'
    }));
  }

  // ============================================================
  // Cumulative Meta-Analysis Plot
  // ============================================================

  function cumulativePlot(container, cumResults, measure) {
    container.innerHTML = '';

    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(measure);
    const transform = (x) => expScale ? Math.exp(x) : x;

    const W = 800, H = Math.max(300, cumResults.length * 30 + 80);
    const margin = { top: 40, right: 120, bottom: 50, left: 200 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    const allTE = cumResults.map(r => r.TE);
    const allLower = cumResults.map(r => r.lower);
    const allUpper = cumResults.map(r => r.upper);
    const dataMin = Math.min(...allLower);
    const dataMax = Math.max(...allUpper);
    const padding = (dataMax - dataMin) * 0.1;

    const xScale = (x) => margin.left + ((x - dataMin + padding) / (dataMax - dataMin + 2 * padding)) * plotW;
    const rowH = plotH / cumResults.length;
    const yScale = (i) => margin.top + i * rowH + rowH / 2;

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
    svg.appendChild(elText('Cumulative Meta-Analysis', {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    // Null line
    const nullX = xScale(0);
    svg.appendChild(el('line', {
      x1: nullX, y1: margin.top,
      x2: nullX, y2: margin.top + plotH,
      stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '5,5'
    }));

    // X-axis
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top + plotH,
      x2: margin.left + plotW, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1
    }));

    for (let i = 0; i <= 5; i++) {
      const v = dataMin - padding + (i / 5) * (dataMax - dataMin + 2 * padding);
      svg.appendChild(el('line', {
        x1: xScale(v), y1: margin.top + plotH,
        x2: xScale(v), y2: margin.top + plotH + 5,
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(transform(v), 2), {
        x: xScale(v), y: margin.top + plotH + 18,
        'text-anchor': 'middle', 'font-size': 10, fill: '#555'
      }));
    }

    cumResults.forEach((r, i) => {
      const y = yScale(i);
      const label = r.lastStudy.label || r.lastStudy.name || `Study ${i + 1}`;

      svg.appendChild(elText(`${label} (n=${r.k})`, {
        x: 10, y: y + 4,
        'font-size': 10, fill: '#333'
      }));

      // Diamond
      const xCenter = xScale(r.TE);
      const xLeft = xScale(r.lower);
      const xRight = xScale(r.upper);
      const dH = 8;

      svg.appendChild(el('polygon', {
        points: `${xCenter},${y - dH} ${xRight},${y} ${xCenter},${y + dH} ${xLeft},${y}`,
        fill: '#27ae60', 'fill-opacity': 0.6,
        stroke: '#1e8449', 'stroke-width': 1
      }));

      const ciText = `${fmt(transform(r.TE))} [${fmt(transform(r.lower))}, ${fmt(transform(r.upper))}]`;
      svg.appendChild(elText(ciText, {
        x: margin.left + plotW + 10, y: y + 4,
        'font-size': 9, fill: '#333'
      }));
    });

    svg.appendChild(elText(`Effect (${measure})`, {
      x: margin.left + plotW / 2, y: H - 10,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333'
    }));
  }

  // ============================================================
  // Meta-Regression Bubble Plot
  // ============================================================

  function bubblePlot(container, mrResult, moderatorLabel) {
    container.innerHTML = '';

    if (!mrResult) return;

    const W = 600, H = 500;
    const margin = { top: 40, right: 40, bottom: 70, left: 70 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    const xs = mrResult.x;
    const ys = mrResult.y;

    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const xPad = (xMax - xMin) * 0.1 || 1;
    const yPad = (yMax - yMin) * 0.1 || 0.5;

    const xScale = (x) => margin.left + ((x - xMin + xPad) / (xMax - xMin + 2 * xPad)) * plotW;
    const yScale = (y) => margin.top + plotH - ((y - yMin + yPad) / (yMax - yMin + 2 * yPad)) * plotH;

    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
    svg.appendChild(elText('Meta-Regression', {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    svg.appendChild(el('rect', {
      x: margin.left, y: margin.top, width: plotW, height: plotH,
      fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1
    }));

    // Regression line
    const lineX1 = xMin - xPad;
    const lineY1 = mrResult.beta0 + mrResult.beta1 * lineX1;
    const lineX2 = xMax + xPad;
    const lineY2 = mrResult.beta0 + mrResult.beta1 * lineX2;

    svg.appendChild(el('line', {
      x1: xScale(lineX1), y1: yScale(lineY1),
      x2: xScale(lineX2), y2: yScale(lineY2),
      stroke: '#e74c3c', 'stroke-width': 2
    }));

    // Bubble sizes proportional to weight (inverse of variance)
    const maxRadius = 20;
    const weights = ys.map((_, i) => 1 / (mrResult.y[i] - mrResult.fitted[i]) ** 2 || 1);
    const maxW = Math.max(...weights);

    for (let i = 0; i < xs.length; i++) {
      const r = maxRadius * Math.sqrt(weights[i] / maxW);
      svg.appendChild(el('circle', {
        cx: xScale(xs[i]), cy: yScale(ys[i]),
        r: Math.max(3, r),
        fill: '#3498db', 'fill-opacity': 0.4,
        stroke: '#2980b9', 'stroke-width': 1
      }));
      svg.appendChild(elText(String(i + 1), {
        x: xScale(xs[i]) + 3, y: yScale(ys[i]) - 3,
        'font-size': 8, fill: '#555'
      }));
    }

    // Axes
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top + plotH,
      x2: margin.left + plotW, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));

    // X-axis ticks
    for (let i = 0; i <= 5; i++) {
      const v = xMin - xPad + (i / 5) * (xMax - xMin + 2 * xPad);
      svg.appendChild(el('line', {
        x1: xScale(v), y1: margin.top + plotH,
        x2: xScale(v), y2: margin.top + plotH + 5,
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(v, 1), {
        x: xScale(v), y: margin.top + plotH + 18,
        'text-anchor': 'middle', 'font-size': 10, fill: '#555'
      }));
    }
    // Y-axis ticks
    for (let i = 0; i <= 5; i++) {
      const v = yMin - yPad + (i / 5) * (yMax - yMin + 2 * yPad);
      svg.appendChild(el('line', {
        x1: margin.left - 5, y1: yScale(v),
        x2: margin.left, y2: yScale(v),
        stroke: '#333', 'stroke-width': 1
      }));
      svg.appendChild(elText(fmt(v, 2), {
        x: margin.left - 8, y: yScale(v) + 3,
        'text-anchor': 'end', 'font-size': 10, fill: '#555'
      }));
    }

    svg.appendChild(elText(moderatorLabel || 'Moderator', {
      x: margin.left + plotW / 2, y: H - 15,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333'
    }));
    svg.appendChild(elText('Effect Size', {
      x: 15, y: margin.top + plotH / 2,
      'text-anchor': 'middle', 'font-size': 12, fill: '#333',
      transform: `rotate(-90, 15, ${margin.top + plotH / 2})`
    }));

    // Info text
    const infoY = margin.top + 10;
    svg.appendChild(elText(`Slope = ${fmt(mrResult.beta1, 4)} (SE ${fmt(mrResult.seBeta1, 4)}), p = ${fmtP(mrResult.p_beta1)}`, {
      x: margin.left + 10, y: infoY,
      'font-size': 10, fill: '#666', 'font-style': 'italic'
    }));
    svg.appendChild(elText(`R2 = ${fmt(mrResult.R2, 1)}%, tau2 = ${fmt(mrResult.tau2, 4)}`, {
      x: margin.left + 10, y: infoY + 15,
      'font-size': 10, fill: '#666', 'font-style': 'italic'
    }));
  }

  // ============================================================
  // SROC (Summary Receiver Operating Characteristic) Plot
  // ============================================================

  /**
   * Render an SROC curve for diagnostic test meta-analysis
   * @param {Object} container - DOM element
   * @param {Array} studies - studies with sensitivity, specificity, fpr
   * @param {Object} diagResult - result from Stats.diagnosticMeta
   * @param {Object} opts - { showCurve, showSummary, showQStar }
   */
  function srocPlot(container, studies, diagResult, opts = {}) {
    container.innerHTML = '';

    const showCurve = opts.showCurve !== false;
    const showSummary = opts.showSummary !== false;
    const showQStar = opts.showQStar !== false;
    const showCI = opts.showCI !== false;

    const W = 620, H = 620;
    const margin = { top: 50, right: 50, bottom: 70, left: 70 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;

    const svg = createSVG(W, H);
    container.appendChild(svg);

    // Scale: both axes 0 to 1
    const xScale = (x) => margin.left + x * plotW;
    const yScale = (y) => margin.top + plotH - y * plotH;

    // Background
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));

    // Title
    svg.appendChild(elText('SROC Curve', {
      x: W / 2, y: 25,
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#333'
    }));

    // Plot area
    svg.appendChild(el('rect', {
      x: margin.left, y: margin.top, width: plotW, height: plotH,
      fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1
    }));

    // Grid lines
    for (let i = 1; i < 10; i++) {
      const v = i / 10;
      // Vertical grid
      svg.appendChild(el('line', {
        x1: xScale(v), y1: margin.top,
        x2: xScale(v), y2: margin.top + plotH,
        stroke: '#eee', 'stroke-width': 0.5
      }));
      // Horizontal grid
      svg.appendChild(el('line', {
        x1: margin.left, y1: yScale(v),
        x2: margin.left + plotW, y2: yScale(v),
        stroke: '#eee', 'stroke-width': 0.5
      }));
    }

    // Diagonal reference line (TPR = FPR, i.e., Se = 1-Sp)
    svg.appendChild(el('line', {
      x1: xScale(0), y1: yScale(0),
      x2: xScale(1), y2: yScale(1),
      stroke: '#bbb', 'stroke-width': 1, 'stroke-dasharray': '5,5'
    }));

    // SROC curve
    if (showCurve && diagResult.sroc && diagResult.sroc.srocCurve) {
      let pathD = '';
      for (let i = 0; i < diagResult.sroc.srocCurve.length; i++) {
        const p = diagResult.sroc.srocCurve[i];
        const x = xScale(p.fpr);
        const y = yScale(p.tpr);
        pathD += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      svg.appendChild(el('path', {
        d: pathD, fill: 'none', stroke: '#e74c3c', 'stroke-width': 2.5
      }));
    }

    // Individual study points
    for (const s of studies) {
      if (!isFinite(s.fpr) || !isFinite(s.sensitivity)) continue;
      svg.appendChild(el('circle', {
        cx: xScale(s.fpr), cy: yScale(s.sensitivity),
        r: 5, fill: '#3498db', 'fill-opacity': 0.5,
        stroke: '#2980b9', 'stroke-width': 1
      }));
    }

    // Summary operating point with CI crosshairs
    if (showSummary && diagResult.pooledSe !== null && diagResult.pooledSp !== null) {
      const sumFPR = 1 - diagResult.pooledSp;
      const sumTPR = diagResult.pooledSe;

      // CI lines for sensitivity (vertical)
      if (showCI && diagResult.seCI) {
        svg.appendChild(el('line', {
          x1: xScale(sumFPR), y1: yScale(diagResult.seCI.lower),
          x2: xScale(sumFPR), y2: yScale(diagResult.seCI.upper),
          stroke: '#2c3e50', 'stroke-width': 1.5
        }));
      }

      // CI lines for specificity (horizontal, on FPR = 1-Sp)
      if (showCI && diagResult.spCI) {
        svg.appendChild(el('line', {
          x1: xScale(1 - diagResult.spCI.upper), y1: yScale(sumTPR),
          x2: xScale(1 - diagResult.spCI.lower), y2: yScale(sumTPR),
          stroke: '#2c3e50', 'stroke-width': 1.5
        }));
      }

      // Summary point
      svg.appendChild(el('circle', {
        cx: xScale(sumFPR), cy: yScale(sumTPR),
        r: 7, fill: '#2c3e50', 'fill-opacity': 0.85,
        stroke: '#1a252f', 'stroke-width': 1.5
      }));
    }

    // Q* point
    if (showQStar && diagResult.sroc && diagResult.sroc.qStarPoint) {
      const q = diagResult.sroc.qStarPoint;
      const qx = xScale(q.fpr);
      const qy = yScale(q.tpr);

      // Diamond shape for Q*
      svg.appendChild(el('polygon', {
        points: `${qx},${qy - 6} ${qx + 6},${qy} ${qx},${qy + 6} ${qx - 6},${qy}`,
        fill: '#9b59b6', 'fill-opacity': 0.85,
        stroke: '#8e44ad', 'stroke-width': 1.5
      }));
    }

    // Axes
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top + plotH,
      x2: margin.left + plotW, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));
    svg.appendChild(el('line', {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: '#333', 'stroke-width': 1.5
    }));

    // X-axis ticks
    for (let i = 0; i <= 10; i++) {
      const v = i / 10;
      const x = xScale(v);
      svg.appendChild(el('line', {
        x1: x, y1: margin.top + plotH,
        x2: x, y2: margin.top + plotH + 5,
        stroke: '#333', 'stroke-width': 1
      }));
      if (i % 2 === 0) {
        svg.appendChild(elText(v.toFixed(1), {
          x: x, y: margin.top + plotH + 20,
          'text-anchor': 'middle', 'font-size': 10, fill: '#555'
        }));
      }
    }

    // Y-axis ticks
    for (let i = 0; i <= 10; i++) {
      const v = i / 10;
      const y = yScale(v);
      svg.appendChild(el('line', {
        x1: margin.left - 5, y1: y,
        x2: margin.left, y2: y,
        stroke: '#333', 'stroke-width': 1
      }));
      if (i % 2 === 0) {
        svg.appendChild(elText(v.toFixed(1), {
          x: margin.left - 10, y: y + 3,
          'text-anchor': 'end', 'font-size': 10, fill: '#555'
        }));
      }
    }

    // Axis labels
    svg.appendChild(elText('1 - Specificity (FPR)', {
      x: margin.left + plotW / 2, y: H - 15,
      'text-anchor': 'middle', 'font-size': 13, fill: '#333'
    }));
    svg.appendChild(elText('Sensitivity (TPR)', {
      x: 18, y: margin.top + plotH / 2,
      'text-anchor': 'middle', 'font-size': 13, fill: '#333',
      transform: `rotate(-90, 18, ${margin.top + plotH / 2})`
    }));

    // AUC and Q* annotations (top-left corner)
    if (diagResult.sroc) {
      const ax = margin.left + 12;
      const ay = margin.top + 18;
      svg.appendChild(elText(`AUC = ${fmt(diagResult.sroc.auc, 3)}`, {
        x: ax, y: ay,
        'font-size': 12, 'font-weight': 'bold', fill: '#e74c3c'
      }));
      svg.appendChild(elText(`Q* = ${fmt(diagResult.sroc.qStar, 3)}`, {
        x: ax, y: ay + 18,
        'font-size': 12, 'font-weight': 'bold', fill: '#9b59b6'
      }));
      if (diagResult.sroc.seQStar) {
        svg.appendChild(elText(`SE(Q*) = ${fmt(diagResult.sroc.seQStar, 3)}`, {
          x: ax, y: ay + 34,
          'font-size': 10, fill: '#9b59b6'
        }));
      }
    }

    // Legend (top-right)
    let lx = margin.left + plotW - 150;
    let ly = margin.top + 15;
    svg.appendChild(el('rect', {
      x: lx, y: ly - 5, width: 140, height: 100,
      fill: 'rgba(255,255,255,0.88)', stroke: '#ccc', 'stroke-width': 0.5
    }));

    svg.appendChild(el('circle', {
      cx: lx + 10, cy: ly + 8, r: 4,
      fill: '#3498db', 'fill-opacity': 0.5, stroke: '#2980b9', 'stroke-width': 1
    }));
    svg.appendChild(elText('Individual Study', { x: lx + 22, y: ly + 11, 'font-size': 9, fill: '#555' }));

    svg.appendChild(el('line', {
      x1: lx + 4, y1: ly + 26, x2: lx + 16, y2: ly + 26,
      stroke: '#e74c3c', 'stroke-width': 2.5
    }));
    svg.appendChild(elText('SROC Curve', { x: lx + 22, y: ly + 29, 'font-size': 9, fill: '#555' }));

    svg.appendChild(el('circle', {
      cx: lx + 10, cy: ly + 44, r: 6,
      fill: '#2c3e50', 'fill-opacity': 0.85, stroke: '#1a252f', 'stroke-width': 1.5
    }));
    svg.appendChild(elText('Summary Point', { x: lx + 22, y: ly + 47, 'font-size': 9, fill: '#555' }));

    svg.appendChild(el('polygon', {
      points: `${lx + 10},${ly + 60 - 5} ${lx + 10 + 5},${ly + 60} ${lx + 10},${ly + 60 + 5} ${lx + 10 - 5},${ly + 60}`,
      fill: '#9b59b6', 'fill-opacity': 0.85, stroke: '#8e44ad', 'stroke-width': 1.5
    }));
    svg.appendChild(elText('Q* Point', { x: lx + 22, y: ly + 63, 'font-size': 9, fill: '#555' }));

    svg.appendChild(el('line', {
      x1: lx + 4, y1: ly + 76, x2: lx + 16, y2: ly + 76,
      stroke: '#bbb', 'stroke-width': 1, 'stroke-dasharray': '5,5'
    }));
    svg.appendChild(elText('Chance Line', { x: lx + 22, y: ly + 79, 'font-size': 9, fill: '#555' }));
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    forestPlot,
    funnelPlot,
    galbraithPlot,
    labbePlot,
    baujatPlot,
    sensitivityPlot,
    cumulativePlot,
    bubblePlot,
    srocPlot
  };
})();
