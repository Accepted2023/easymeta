/**
 * MetaLab - Main Application Logic
 * Connects data input, statistical engine, and visualization
 */

const App = (function () {
  'use strict';

  // Application state
  const state = {
    studies: [],
    dataType: 'binary',
    measure: 'OR',
    model: 'random',
    tau2Method: 'DL',
    ciLevel: 0.95,
    subgroupVar: null,
    metaRegVar: null,
    currentPage: 'data-input'
  };

  // Example datasets
  const examples = {
    binary_aspirin: {
      name: '阿司匹林预防心肌梗死 (OR)',
      desc: '经典二分类示例：阿司匹林 vs 安慰剂对心肌梗死的预防效果',
      meta: '7 RCT | Binary | OR',
      dataType: 'binary',
      measure: 'OR',
      studies: [
        { label: 'Vaughan 1973', events_t: 4, total_t: 11, events_c: 5, total_c: 11, year: 1973, subgroup: 'Older' },
        { label: 'CDP-A 1976', events_t: 6, total_t: 758, events_c: 6, total_c: 771, year: 1976, subgroup: 'Newer' },
        { label: 'Gent 1979', events_t: 6, total_t: 162, events_c: 6, total_c: 157, year: 1979, subgroup: 'Newer' },
        { label: 'PARIS 1980', events_t: 13, total_t: 810, events_c: 16, total_c: 406, year: 1980, subgroup: 'Newer' },
        { label: 'AMIS 1980', events_t: 63, total_t: 2267, events_c: 65, total_c: 2257, year: 1980, subgroup: 'Newer' },
        { label: 'CDP-B 1980', events_t: 20, total_t: 758, events_c: 31, total_c: 771, year: 1980, subgroup: 'Newer' },
        { label: 'ISIS-2 1988', events_t: 154, total_t: 8587, events_c: 215, total_c: 8600, year: 1988, subgroup: 'Newer' }
      ]
    },
    continuous_smd: {
      name: '认知行为疗法对抑郁 (SMD)',
      desc: '连续型数据示例：CBT 对抑郁症严重程度的效果量',
      meta: '8 RCT | Continuous | SMD',
      dataType: 'continuous',
      measure: 'SMD',
      studies: [
        { label: 'Study 1', mean_t: -8.5, sd_t: 4.2, n_t: 35, mean_c: -4.1, sd_c: 4.5, n_c: 33, year: 2010, subgroup: 'Adult' },
        { label: 'Study 2', mean_t: -7.2, sd_t: 3.8, n_t: 40, mean_c: -3.5, sd_c: 4.1, n_c: 38, year: 2011, subgroup: 'Adult' },
        { label: 'Study 3', mean_t: -9.1, sd_t: 5.0, n_t: 28, mean_c: -5.0, sd_c: 4.8, n_c: 30, year: 2012, subgroup: 'Adolescent' },
        { label: 'Study 4', mean_t: -6.8, sd_t: 3.5, n_t: 45, mean_c: -2.9, sd_c: 3.9, n_c: 43, year: 2013, subgroup: 'Adult' },
        { label: 'Study 5', mean_t: -10.2, sd_t: 5.5, n_t: 25, mean_c: -4.8, sd_c: 5.2, n_c: 27, year: 2014, subgroup: 'Adolescent' },
        { label: 'Study 6', mean_t: -8.0, sd_t: 4.1, n_t: 50, mean_c: -3.2, sd_c: 4.3, n_c: 48, year: 2015, subgroup: 'Adult' },
        { label: 'Study 7', mean_t: -7.5, sd_t: 3.9, n_t: 32, mean_c: -2.0, sd_c: 4.0, n_c: 35, year: 2016, subgroup: 'Adult' },
        { label: 'Study 8', mean_t: -9.5, sd_t: 4.7, n_t: 38, mean_c: -4.5, sd_c: 4.9, n_c: 40, year: 2017, subgroup: 'Adolescent' }
      ]
    },
    generic_effect: {
      name: '直接效应量示例 (Generic)',
      desc: '已计算的效应量及其标准误，适用于各种已有汇总数据',
      meta: '10 studies | Generic | TE+SE',
      dataType: 'generic',
      measure: 'MD',
      studies: [
        { label: 'Trial A', TE: 0.45, seTE: 0.12, year: 2005, subgroup: 'Group 1' },
        { label: 'Trial B', TE: 0.32, seTE: 0.15, year: 2007, subgroup: 'Group 1' },
        { label: 'Trial C', TE: 0.51, seTE: 0.10, year: 2008, subgroup: 'Group 1' },
        { label: 'Trial D', TE: 0.28, seTE: 0.18, year: 2009, subgroup: 'Group 1' },
        { label: 'Trial E', TE: 0.55, seTE: 0.14, year: 2010, subgroup: 'Group 2' },
        { label: 'Trial F', TE: 0.18, seTE: 0.20, year: 2011, subgroup: 'Group 2' },
        { label: 'Trial G', TE: 0.62, seTE: 0.13, year: 2012, subgroup: 'Group 2' },
        { label: 'Trial H', TE: 0.40, seTE: 0.16, year: 2013, subgroup: 'Group 2' },
        { label: 'Trial I', TE: 0.35, seTE: 0.11, year: 2014, subgroup: 'Group 3' },
        { label: 'Trial J', TE: 0.48, seTE: 0.17, year: 2015, subgroup: 'Group 3' }
      ]
    },
    correlation: {
      name: '相关系数示例 (Fisher z)',
      desc: '效应量为相关系数 r，转换为 Fisher z 进行合并',
      meta: '6 studies | Correlation | r',
      dataType: 'correlation',
      measure: 'CORR',
      studies: [
        { label: 'Study 1', r: 0.35, n: 120, year: 2010, subgroup: 'A' },
        { label: 'Study 2', r: 0.42, n: 85, year: 2012, subgroup: 'B' },
        { label: 'Study 3', r: 0.28, n: 200, year: 2013, subgroup: 'A' },
        { label: 'Study 4', r: 0.50, n: 60, year: 2014, subgroup: 'B' },
        { label: 'Study 5', r: 0.38, n: 150, year: 2015, subgroup: 'A' },
        { label: 'Study 6', r: 0.45, n: 90, year: 2016, subgroup: 'B' }
      ]
    },
    diagnostic_dor: {
      name: '诊断试验示例: biomarker诊断 (SROC)',
      desc: '诊断四格表数据 (TP/FP/FN/TN)，计算 Se/Sp/PLR/NLR/DOR 并绘制 SROC 曲线',
      meta: '12 studies | Diagnostic | DOR',
      dataType: 'diagnostic',
      measure: 'DOR',
      studies: [
        { label: 'Jeong 2014', TP: 28, FP: 5, FN: 3, TN: 42, year: 2014, subgroup: 'ELISA' },
        { label: 'Park 2015', TP: 35, FP: 8, FN: 5, TN: 55, year: 2015, subgroup: 'ELISA' },
        { label: 'Chen 2015', TP: 42, FP: 6, FN: 4, TN: 48, year: 2015, subgroup: 'ELISA' },
        { label: 'Wang 2016', TP: 51, FP: 12, FN: 6, TN: 65, year: 2016, subgroup: 'ELISA' },
        { label: 'Liu 2016', TP: 38, FP: 7, FN: 4, TN: 50, year: 2016, subgroup: 'ELISA' },
        { label: 'Zhang 2017', TP: 45, FP: 10, FN: 5, TN: 58, year: 2017, subgroup: 'POCT' },
        { label: 'Kim 2017', TP: 33, FP: 9, FN: 7, TN: 40, year: 2017, subgroup: 'POCT' },
        { label: 'Li 2018', TP: 56, FP: 14, FN: 8, TN: 72, year: 2018, subgroup: 'POCT' },
        { label: 'Tanaka 2018', TP: 41, FP: 8, FN: 3, TN: 45, year: 2018, subgroup: 'ELISA' },
        { label: 'Brown 2019', TP: 48, FP: 11, FN: 6, TN: 60, year: 2019, subgroup: 'POCT' },
        { label: 'Singh 2019', TP: 29, FP: 6, FN: 4, TN: 38, year: 2019, subgroup: 'ELISA' },
        { label: 'Davis 2020', TP: 60, FP: 15, FN: 7, TN: 80, year: 2020, subgroup: 'POCT' }
      ]
    }
  };

  // ============================================================
  // Navigation
  // ============================================================

  function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
      });
    });
  }

  function navigateTo(pageId) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`)?.classList.remove('hidden');

    state.currentPage = pageId;

    // Render page content
    switch (pageId) {
      case 'data-view': renderDataView(); break;
      case 'main-analysis': renderMainAnalysis(); break;
      case 'subgroup': renderSubgroup(); break;
      case 'meta-regression': renderMetaRegression(); break;
      case 'heterogeneity': renderHeterogeneity(); break;
      case 'pub-bias': renderPubBias(); break;
      case 'sensitivity': renderSensitivity(); break;
      case 'diagnostic': renderDiagnostic(); break;
      case 'report': renderReport(); break;
    }
  }

  // ============================================================
  // Data Input
  // ============================================================

  function initDataInput() {
    // Data type change
    const typeSelect = document.getElementById('data-type-select');
    const measureSelect = document.getElementById('measure-select');
    const hintDiv = document.getElementById('data-type-hint');

    const typeConfig = {
      binary: {
        measures: ['OR', 'RR', 'RD'],
        hint: '输入各组的事件数(events)和总数(total)，计算 OR/RR/RD'
      },
      continuous: {
        measures: ['MD', 'SMD'],
        hint: '输入各组的均值(mean)、标准差(sd)和样本量(n)，计算 MD/SMD'
      },
      generic: {
        measures: ['MD'],
        hint: '直接输入效应量(TE)和标准误(SE)'
      },
      correlation: {
        measures: ['CORR'],
        hint: '输入相关系数 r 和样本量 n，使用 Fisher z 变换'
      },
      proportion: {
        measures: ['PROP'],
        hint: '输入事件数和总数，计算比例的 logit 变换'
      },
      hazard: {
        measures: ['HR'],
        hint: '输入 HR 及其置信区间或标准误'
      },
      diagnostic: {
        measures: ['DOR'],
        hint: '输入诊断四格表数据 (TP, FP, FN, TN)，计算 Se/Sp/PLR/NLR/DOR 及 SROC 曲线'
      }
    };

    function updateMeasureOptions() {
      const type = typeSelect.value;
      state.dataType = type;
      const config = typeConfig[type];
      hintDiv.textContent = config.hint;

      measureSelect.innerHTML = '';
      const measureLabels = {
        OR: 'Odds Ratio (OR)', RR: 'Risk Ratio (RR)', RD: 'Risk Difference (RD)',
        MD: 'Mean Difference (MD)', SMD: 'Standardized Mean Difference (SMD)',
        CORR: "Correlation (Fisher's z)", PROP: 'Proportion (logit)', HR: 'Hazard Ratio (HR)',
        DOR: 'Diagnostic Odds Ratio (DOR)'
      };
      for (const m of config.measures) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = measureLabels[m] || m;
        measureSelect.appendChild(opt);
      }
      state.measure = config.measures[0];
    }

    typeSelect.addEventListener('change', updateMeasureOptions);
    measureSelect.addEventListener('change', e => state.measure = e.target.value);
    document.getElementById('model-select').addEventListener('change', e => {
      state.model = e.target.value;
      document.getElementById('tau2-method-group').style.display = e.target.value === 'random' ? '' : 'none';
    });
    document.getElementById('tau2-select').addEventListener('change', e => state.tau2Method = e.target.value);
    document.getElementById('ci-level').addEventListener('change', e => state.ciLevel = parseFloat(e.target.value));

    updateMeasureOptions();

    // Example datasets
    renderExampleList();

    // CSV import
    initCSVImport();

    // Manual entry
    initManualEntry();

    // Tabs
    initTabs('input-tabs');

    // File upload area
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('csv-file-input');
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleFileUpload(e.target.files[0]));
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = '#3498db'; });
    uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '');
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      handleFileUpload(e.dataTransfer.files[0]);
    });
  }

  function renderExampleList() {
    const container = document.getElementById('example-list');
    container.innerHTML = '';

    for (const [key, ex] of Object.entries(examples)) {
      const card = document.createElement('div');
      card.className = 'example-card';
      card.innerHTML = `
        <div class="title">${ex.name}</div>
        <div class="desc">${ex.desc}</div>
        <div class="meta">${ex.meta}</div>
      `;
      card.addEventListener('click', () => loadExample(key));
      container.appendChild(card);
    }
  }

  function loadExample(key) {
    const ex = examples[key];
    if (!ex) return;

    state.dataType = ex.dataType;
    state.measure = ex.measure;
    state.studies = ex.studies.map(s => ({ ...s }));

    // Update UI
    document.getElementById('data-type-select').value = ex.dataType;
    document.getElementById('data-type-select').dispatchEvent(new Event('change'));
    document.getElementById('measure-select').value = ex.measure;

    alert('已加载示例数据：' + ex.name + ' (' + ex.studies.length + ' 个研究)\n\n请点击左侧导航查看分析结果。');
  }

  // ============================================================
  // CSV Import
  // ============================================================

  function initCSVImport() {
    document.getElementById('parse-csv-btn').addEventListener('click', () => {
      const text = document.getElementById('csv-textarea').value.trim();
      if (!text) {
        alert('请输入 CSV 数据');
        return;
      }
      parseCSV(text);
    });
  }

  function handleFileUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      document.getElementById('csv-textarea').value = text;
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      alert('CSV 数据至少需要标题行和一行数据');
      return;
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const studies = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim());
      const study = {};
      for (let j = 0; j < headers.length && j < parts.length; j++) {
        const h = headers[j];
        const val = parts[j];
        // Try to parse as number
        const num = parseFloat(val);
        study[h] = isNaN(num) ? val : num;
      }
      studies.push(study);
    }

    state.studies = studies;

    // Auto-detect data type from columns
    const hasBinary = headers.includes('events_t') && headers.includes('total_t') && headers.includes('events_c') && headers.includes('total_c');
    const hasContinuous = headers.includes('mean_t') && headers.includes('sd_t') && headers.includes('n_t') && headers.includes('mean_c') && headers.includes('sd_c') && headers.includes('n_c');
    const hasGeneric = headers.includes('te') && headers.includes('sete');
    const hasCorr = headers.includes('r') && headers.includes('n');
    const hasProp = headers.includes('events') && headers.includes('total') && !hasBinary;
    const hasHR = headers.includes('hr') && (headers.includes('ci_lower') || headers.includes('se'));
    const hasDiagnostic = headers.includes('tp') && headers.includes('fp') && headers.includes('fn') && headers.includes('tn');

    let detectedType = 'generic';
    if (hasBinary) detectedType = 'binary';
    else if (hasContinuous) detectedType = 'continuous';
    else if (hasCorr) detectedType = 'correlation';
    else if (hasProp) detectedType = 'proportion';
    else if (hasHR) detectedType = 'hazard';
    else if (hasDiagnostic) detectedType = 'diagnostic';
    else if (hasGeneric) detectedType = 'generic';

    state.dataType = detectedType;
    const typeSelect = document.getElementById('data-type-select');
    typeSelect.value = detectedType;
    typeSelect.dispatchEvent(new Event('change'));

    // Show preview
    const previewDiv = document.getElementById('csv-preview');
    let html = '<div class="alert alert-success">成功导入 ' + studies.length + ' 个研究</div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    for (const h of headers) html += '<th>' + h + '</th>';
    html += '</tr></thead><tbody>';
    for (const s of studies.slice(0, 5)) {
      html += '<tr>';
      for (const h of headers) html += '<td>' + s[h] + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    if (studies.length > 5) {
      html += '<div class="alert alert-info">仅显示前 5 行，共 ' + studies.length + ' 行</div>';
    }
    previewDiv.innerHTML = html;

    alert('成功导入 ' + studies.length + ' 个研究！\n请点击左侧导航查看分析结果。');
  }

  // ============================================================
  // Manual Entry
  // ============================================================

  function initManualEntry() {
    renderManualInputTable();
  }

  function renderManualInputTable() {
    const container = document.getElementById('manual-input-area');
    const cols = getColumnsForType(state.dataType);

    let html = '<div class="alert alert-info">手动录入数据，点击"添加研究"增加行。直接在表格中编辑数据。</div>';
    html += '<div class="btn-group" style="margin-bottom: 12px;">';
    html += '<button class="btn btn-primary btn-sm" id="manual-add-row">+ 添加研究</button>';
    html += '<button class="btn btn-success btn-sm" id="manual-save">保存数据</button>';
    html += '</div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    html += '<th>#</th>';
    for (const c of cols) html += '<th>' + c.label + '</th>';
    html += '</tr></thead><tbody id="manual-tbody">';

    // Add some empty rows
    for (let i = 0; i < 5; i++) {
      html += '<tr>';
      html += '<td class="study-row-num">' + (i + 1) + '</td>';
      for (const c of cols) {
        html += '<td><input type="text" data-col="' + c.key + '" value=""></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Add row button
    document.getElementById('manual-add-row').addEventListener('click', () => {
      const tbody = document.getElementById('manual-tbody');
      const rowIdx = tbody.children.length;
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="study-row-num">' + (rowIdx + 1) + '</td>';
      for (const c of cols) {
        tr.innerHTML += '<td><input type="text" data-col="' + c.key + '" value=""></td>';
      }
      tbody.appendChild(tr);
    });

    // Save button
    document.getElementById('manual-save').addEventListener('click', () => {
      const tbody = document.getElementById('manual-tbody');
      const studies = [];
      for (const tr of tbody.children) {
        const inputs = tr.querySelectorAll('input');
        const study = {};
        let hasData = false;
        for (const input of inputs) {
          const col = input.dataset.col;
          const val = input.value.trim();
          if (val) {
            const num = parseFloat(val);
            study[col] = isNaN(num) ? val : num;
            hasData = true;
          }
        }
        if (hasData) studies.push(study);
      }
      if (studies.length === 0) {
        alert('请输入至少一个研究的数据');
        return;
      }
      state.studies = studies;
      alert('已保存 ' + studies.length + ' 个研究！');
    });
  }

  function getColumnsForType(type) {
    switch (type) {
      case 'binary':
        return [
          { key: 'label', label: '研究名称' },
          { key: 'events_t', label: '试验组事件' },
          { key: 'total_t', label: '试验组总数' },
          { key: 'events_c', label: '对照组事件' },
          { key: 'total_c', label: '对照组总数' },
          { key: 'year', label: '年份' },
          { key: 'subgroup', label: '亚组' }
        ];
      case 'continuous':
        return [
          { key: 'label', label: '研究名称' },
          { key: 'mean_t', label: '试验组均值' },
          { key: 'sd_t', label: '试验组SD' },
          { key: 'n_t', label: '试验组N' },
          { key: 'mean_c', label: '对照组均值' },
          { key: 'sd_c', label: '对照组SD' },
          { key: 'n_c', label: '对照组N' },
          { key: 'year', label: '年份' },
          { key: 'subgroup', label: '亚组' }
        ];
      case 'generic':
        return [
          { key: 'label', label: '研究名称' },
          { key: 'TE', label: '效应量(TE)' },
          { key: 'seTE', label: '标准误(SE)' },
          { key: 'year', label: '年份' },
          { key: 'subgroup', label: '亚组' }
        ];
      case 'correlation':
        return [
          { key: 'label', label: '研究名称' },
          { key: 'r', label: '相关系数 r' },
          { key: 'n', label: '样本量 N' },
          { key: 'year', label: '年份' },
          { key: 'subgroup', label: '亚组' }
        ];
      case 'proportion':
        return [
          { key: 'label', label: '研究名称' },
          { key: 'events', label: '事件数' },
          { key: 'total', label: '总数' },
          { key: 'year', label: '年份' },
          { key: 'subgroup', label: '亚组' }
        ];
      case 'hazard':
        return [
          { key: 'label', label: '研究名称' },
          { key: 'hr', label: 'HR' },
          { key: 'ci_lower', label: 'CI下限' },
          { key: 'ci_upper', label: 'CI上限' },
          { key: 'se', label: 'SE(可选)' },
          { key: 'year', label: '年份' },
          { key: 'subgroup', label: '亚组' }
        ];
      case 'diagnostic':
        return [
          { key: 'label', label: '研究名称' },
          { key: 'TP', label: 'TP(真阳性)' },
          { key: 'FP', label: 'FP(假阳性)' },
          { key: 'FN', label: 'FN(假阴性)' },
          { key: 'TN', label: 'TN(真阴性)' },
          { key: 'year', label: '年份' },
          { key: 'subgroup', label: '亚组' }
        ];
      default:
        return [];
    }
  }

  // ============================================================
  // Compute Effect Sizes
  // ============================================================

  function computeEffectSizes() {
    const studies = state.studies.map(s => {
      let result;
      switch (state.dataType) {
        case 'binary':
          result = Stats.calcBinaryEffect(s, state.measure);
          break;
        case 'continuous':
          result = Stats.calcContinuousEffect(s, state.measure);
          break;
        case 'generic':
          result = { TE: s.TE, seTE: s.seTE, measure: state.measure };
          break;
        case 'correlation':
          result = Stats.calcCorrEffect(s);
          break;
        case 'proportion':
          result = Stats.calcProportionEffect(s);
          break;
        case 'hazard':
          result = Stats.calcHREffect(s);
          break;
        case 'diagnostic':
          result = Stats.calcDiagnosticEffect(s);
          break;
        default:
          result = { TE: s.TE, seTE: s.seTE };
      }
      return { ...s, ...result };
    });
    return studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
  }

  // ============================================================
  // Data View Page
  // ============================================================

  function renderDataView() {
    const container = document.getElementById('data-table-container');
    const badge = document.getElementById('study-count-badge');
    const overview = document.getElementById('effect-overview');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-warning">尚未录入数据。请先到"数据输入"页面录入数据。</div>';
      badge.textContent = '0 studies';
      overview.innerHTML = '<div class="alert alert-info">请先录入数据</div>';
      return;
    }

    badge.textContent = state.studies.length + ' studies';

    const cols = getColumnsForType(state.dataType);
    const studies = computeEffectSizes();

    let html = '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    html += '<th>#</th>';
    for (const c of cols) html += '<th>' + c.label + '</th>';
    html += '<th>TE</th><th>SE</th>';
    html += '</tr></thead><tbody>';

    state.studies.forEach((s, i) => {
      const computed = studies[i] || {};
      html += '<tr>';
      html += '<td class="study-row-num">' + (i + 1) + '</td>';
      for (const c of cols) {
        const val = s[c.key] !== undefined ? s[c.key] : '';
        html += '<td><input type="text" data-idx="' + i + '" data-col="' + c.key + '" value="' + val + '"></td>';
      }
      html += '<td style="font-family:monospace;font-size:11px;">' + (isFinite(computed.TE) ? computed.TE.toFixed(4) : '-') + '</td>';
      html += '<td style="font-family:monospace;font-size:11px;">' + (isFinite(computed.seTE) ? computed.seTE.toFixed(4) : '-') + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    // Editable inputs
    container.querySelectorAll('input[data-idx]').forEach(input => {
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.idx);
        const col = input.dataset.col;
        const val = input.value.trim();
        const num = parseFloat(val);
        state.studies[idx][col] = isNaN(num) ? val : num;
      });
    });

    // Effect overview
    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(state.measure);
    const transform = (x) => expScale ? Math.exp(x) : x;
    const teValues = studies.map(s => transform(s.TE));

    const meanTE = teValues.reduce((a, b) => a + b, 0) / teValues.length;
    const minTE = Math.min(...teValues);
    const maxTE = Math.max(...teValues);

    overview.innerHTML = `
      <div class="result-grid">
        <div class="stat-card">
          <div class="label">研究数 (k)</div>
          <div class="value">${studies.length}</div>
        </div>
        <div class="stat-card success">
          <div class="label">效应量范围</div>
          <div class="value">${minTE.toFixed(3)} - ${maxTE.toFixed(3)}</div>
          <div class="sub">${state.measure} (${expScale ? 'exponentiated' : 'raw'})</div>
        </div>
        <div class="stat-card warning">
          <div class="label">效应量均值</div>
          <div class="value">${meanTE.toFixed(3)}</div>
          <div class="sub">简单算术平均</div>
        </div>
        <div class="stat-card purple">
          <div class="label">数据类型</div>
          <div class="value" style="font-size:16px;">${state.dataType}</div>
          <div class="sub">指标: ${state.measure}</div>
        </div>
      </div>
    `;

    // Add study button
    document.getElementById('add-study-btn').onclick = () => {
      const cols = getColumnsForType(state.dataType);
      const newStudy = {};
      for (const c of cols) newStudy[c.key] = '';
      state.studies.push(newStudy);
      renderDataView();
    };

    // Clear data
    document.getElementById('clear-data-btn').onclick = () => {
      if (confirm('确定要清空所有数据吗？')) {
        state.studies = [];
        renderDataView();
      }
    };
  }

  // ============================================================
  // Main Analysis Page
  // ============================================================

  function renderMainAnalysis() {
    const container = document.getElementById('main-analysis-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先在"数据输入"页面录入数据。</div>';
      return;
    }

    const studies = computeEffectSizes();
    if (studies.length === 0) {
      container.innerHTML = '<div class="alert alert-danger">无法计算效应量，请检查数据是否完整。</div>';
      return;
    }

    // Run meta-analysis
    const result = state.model === 'random'
      ? Stats.randomEffect(studies, state.tau2Method)
      : Stats.fixedEffect(studies);

    if (!result) {
      container.innerHTML = '<div class="alert alert-danger">分析失败，请检查数据。</div>';
      return;
    }

    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(state.measure);
    const transform = (x) => expScale ? Math.exp(x) : x;
    const studyNames = studies.map(s => s.label || s.name || 'Study');

    let html = '';

    // Summary statistics
    const tr = Stats.expTransform(result.TE, result.seTE, result.lower, result.upper, state.measure);
    html += '<div class="result-grid">';
    html += `<div class="stat-card">
      <div class="label">合并效应量</div>
      <div class="value">${tr.estimate.toFixed(3)}</div>
      <div class="sub">95% CI: [${tr.lower.toFixed(3)}, ${tr.upper.toFixed(3)}]</div>
    </div>`;
    html += `<div class="stat-card ${result.p < 0.05 ? 'danger' : 'success'}">
      <div class="label">Z 检验</div>
      <div class="value">${result.z.toFixed(3)}</div>
      <div class="sub">p = ${Stats.formatP(result.p)}</div>
    </div>`;
    html += `<div class="stat-card ${result.I2 > 50 ? 'danger' : 'warning'}">
      <div class="label">I&sup2; (异质性)</div>
      <div class="value">${result.I2.toFixed(1)}%</div>
      <div class="sub">Q = ${result.Q.toFixed(2)}, p = ${Stats.formatP(result.Q_p)}</div>
    </div>`;
    if (state.model === 'random') {
      html += `<div class="stat-card purple">
        <div class="label">&tau;&sup2; (研究间方差)</div>
        <div class="value">${(result.tau2 || 0).toFixed(4)}</div>
        <div class="sub">&tau; = ${(result.tau || 0).toFixed(4)}</div>
      </div>`;
    }
    html += `<div class="stat-card">
      <div class="label">研究数</div>
      <div class="value">${result.k}</div>
      <div class="sub">模型: ${state.model === 'random' ? '随机效应' : '固定效应'}</div>
    </div>`;
    html += '</div>';

    // Model details
    html += '<div class="card"><div class="card-header"><h3>模型详情</h3></div>';
    html += '<div class="inline-stats">';
    html += `<strong>分析模型:</strong> ${state.model === 'random' ? '随机效应模型 (DerSimonian-Laird)' : '固定效应模型 (Inverse Variance)'}<br>`;
    html += `<strong>效应量类型:</strong> ${state.measure}<br>`;
    if (expScale) {
      html += `<strong>对数尺度合并效应:</strong> ${result.TE.toFixed(4)} (SE ${result.seTE.toFixed(4)})<br>`;
      html += `<strong>指数化合并效应:</strong> ${tr.estimate.toFixed(4)} [${tr.lower.toFixed(4)}, ${tr.upper.toFixed(4)}]<br>`;
    } else {
      html += `<strong>合并效应:</strong> ${result.TE.toFixed(4)} (SE ${result.seTE.toFixed(4)})<br>`;
      html += `<strong>95% CI:</strong> [${result.lower.toFixed(4)}, ${result.upper.toFixed(4)}]<br>`;
    }
    html += `<strong>Z 统计量:</strong> ${result.z.toFixed(4)}, p = ${Stats.formatP(result.p)}<br>`;
    html += `<strong>Cochran's Q:</strong> ${result.Q.toFixed(4)} (df = ${result.df}), p = ${Stats.formatP(result.Q_p)}<br>`;
    html += `<strong>I&sup2;:</strong> ${result.I2.toFixed(2)}%<br>`;
    html += `<strong>H 统计量:</strong> ${result.H.toFixed(4)}<br>`;
    if (state.model === 'random') {
      html += `<strong>&tau;&sup2;:</strong> ${(result.tau2 || 0).toFixed(6)}<br>`;
      html += `<strong>&tau;:</strong> ${(result.tau || 0).toFixed(6)}<br>`;
      if (result.I2_upper !== undefined) {
        html += `<strong>I&sup2; 95% CI:</strong> [${(result.I2_lower || 0).toFixed(1)}%, ${(result.I2_upper || 100).toFixed(1)}%]<br>`;
      }
    }
    html += '</div></div>';

    // Forest plot
    html += '<div class="card"><div class="card-header"><h3>森林图 (Forest Plot)</h3>';
    html += '<div class="btn-group"><button class="btn btn-outline btn-sm" id="toggle-model-btn">切换模型</button></div>';
    html += '</div><div id="forest-plot-container" class="plot-container"></div></div>';

    container.innerHTML = html;

    // Render forest plot
    Plots.forestPlot(
      document.getElementById('forest-plot-container'),
      studies, result,
      { measure: state.measure, studyNames }
    );

    // Toggle model button
    document.getElementById('toggle-model-btn').addEventListener('click', () => {
      state.model = state.model === 'random' ? 'fixed' : 'random';
      document.getElementById('model-select').value = state.model;
      renderMainAnalysis();
    });
  }

  // ============================================================
  // Subgroup Analysis Page
  // ============================================================

  function renderSubgroup() {
    const container = document.getElementById('subgroup-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先录入数据。</div>';
      return;
    }

    // Find subgroup variable
    const subgroupKeys = ['subgroup', 'group', 'type', 'category'];
    let subKey = subgroupKeys.find(k => state.studies.some(s => s[k] !== undefined && s[k] !== ''));

    if (!subKey) {
      // Try numeric variables that could be categorical
      container.innerHTML = '<div class="alert alert-warning">数据中没有找到亚组变量。请确保数据中包含 "subgroup" 列。</div>';
      return;
    }

    // Subgroup variable selector
    let html = '<div class="card"><div class="card-header"><h3>亚组分析设置</h3></div>';
    html += '<div class="form-group"><label>亚组变量</label>';
    html += '<select class="form-control" id="subgroup-var-select" style="max-width:300px;">';
    for (const k of subgroupKeys) {
      if (state.studies.some(s => s[k] !== undefined && s[k] !== '')) {
        html += `<option value="${k}" ${k === subKey ? 'selected' : ''}>${k}</option>`;
      }
    }
    html += '</select></div></div>';

    container.innerHTML = html;

    document.getElementById('subgroup-var-select').addEventListener('change', e => {
      subKey = e.target.value;
      performSubgroupAnalysis(subKey);
    });

    performSubgroupAnalysis(subKey);
  }

  function performSubgroupAnalysis(subKey) {
    const container = document.getElementById('subgroup-content');
    const studies = computeEffectSizes();

    // Add subgroup info
    studies.forEach((s, i) => {
      s.subgroup = state.studies[i][subKey] || 'Unknown';
    });

    const result = Stats.subgroupAnalysis(studies, subKey, state.model, state.tau2Method);

    if (!result || result.groups.length < 2) {
      container.innerHTML += '<div class="alert alert-warning">亚组分析需要至少2个亚组。</div>';
      return;
    }

    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(state.measure);

    let html = '<div class="card"><div class="card-header"><h3>亚组分析结果</h3></div>';

    // Between-group test
    html += '<div class="result-grid">';
    html += `<div class="stat-card ${result.Q_between_p < 0.05 ? 'danger' : 'success'}">
      <div class="label">组间检验 (Q_between)</div>
      <div class="value">${result.Q_between.toFixed(2)}</div>
      <div class="sub">df = ${result.df_between}, p = ${Stats.formatP(result.Q_between_p)}</div>
    </div>`;
    html += `<div class="stat-card warning">
      <div class="label">组内异质性 (Q_within)</div>
      <div class="value">${result.Q_within.toFixed(2)}</div>
      <div class="sub">df = ${result.df_within}, p = ${Stats.formatP(result.Q_within_p)}</div>
    </div>`;
    html += `<div class="stat-card purple">
      <div class="label">I&sup2; (组间)</div>
      <div class="value">${result.I2_between.toFixed(1)}%</div>
    </div>`;
    html += '</div>';

    // Subgroup table
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    html += '<th>亚组</th><th>k</th><th>合并效应量</th><th>95% CI</th><th>Z</th><th>p</th><th>I&sup2;</th>';
    if (state.model === 'random') html += '<th>&tau;&sup2;</th>';
    html += '</tr></thead><tbody>';

    for (const g of result.groups) {
      const tr = Stats.expTransform(g.TE, g.seTE, g.lower, g.upper, state.measure);
      html += `<tr>
        <td><strong>${g.name}</strong></td>
        <td>${g.k}</td>
        <td>${tr.estimate.toFixed(3)}</td>
        <td>[${tr.lower.toFixed(3)}, ${tr.upper.toFixed(3)}]</td>
        <td>${g.z.toFixed(3)}</td>
        <td>${Stats.formatP(g.p)}</td>
        <td>${(g.I2 || 0).toFixed(1)}%</td>
        ${state.model === 'random' ? `<td>${(g.tau2 || 0).toFixed(4)}</td>` : ''}
      </tr>`;
    }
    html += '</tbody></table></div>';
    html += '</div>';

    // Forest plot with subgroups
    html += '<div class="card"><div class="card-header"><h3>亚组森林图</h3></div>';
    html += '<div id="subgroup-forest-container" class="plot-container"></div></div>';

    container.innerHTML += html;

    // Render forest plot per group
    const plotContainer = document.getElementById('subgroup-forest-container');
    for (const g of result.groups) {
      const groupStudies = studies.filter(s => s.subgroup === g.name);
      if (groupStudies.length > 0) {
        const groupDiv = document.createElement('div');
        groupDiv.innerHTML = `<div class="plot-title">${g.name} (k=${g.k})</div>`;
        plotContainer.appendChild(groupDiv);
        const plotDiv = document.createElement('div');
        plotDiv.className = 'plot-container';
        groupDiv.appendChild(plotDiv);
        Plots.forestPlot(plotDiv, groupStudies, g, {
          measure: state.measure,
          studyNames: groupStudies.map(s => s.label || s.name || 'Study')
        });
      }
    }
  }

  // ============================================================
  // Meta-Regression Page
  // ============================================================

  function renderMetaRegression() {
    const container = document.getElementById('meta-regression-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先录入数据。</div>';
      return;
    }

    const studies = computeEffectSizes();
    if (studies.length < 4) {
      container.innerHTML = '<div class="alert alert-warning">Meta 回归需要至少 4 个研究。</div>';
      return;
    }

    // Find potential moderators (numeric variables)
    const possibleModerators = ['year', 'n_t', 'n_c', 'total_t', 'total_c', 'mean_t', 'mean_c',
      'sd_t', 'sd_c', 'n', 'r', 'latitude', 'age', 'dose', 'duration'];
    const moderators = possibleModerators.filter(m =>
      studies.some(s => s[m] !== undefined && !isNaN(parseFloat(s[m])))
    );

    // Also check for any other numeric keys
    const allKeys = new Set();
    studies.forEach(s => Object.keys(s).forEach(k => allKeys.add(k)));
    const extraModerators = [...allKeys].filter(k =>
      !moderators.includes(k) && k !== 'label' && k !== 'subgroup' &&
      k !== 'TE' && k !== 'seTE' && k !== 'measure' &&
      studies.some(s => s[k] !== undefined && !isNaN(parseFloat(s[k])))
    );

    const allModerators = [...moderators, ...extraModerators];

    if (allModerators.length === 0) {
      container.innerHTML = '<div class="alert alert-warning">没有找到可用的连续型协变量。</div>';
      return;
    }

    let html = '<div class="card"><div class="card-header"><h3>Meta 回归设置</h3></div>';
    html += '<div class="form-group"><label>选择协变量 (Moderator)</label>';
    html += '<select class="form-control" id="mr-moderator-select" style="max-width:300px;">';
    for (const m of allModerators) {
      html += `<option value="${m}">${m}</option>`;
    }
    html += '</select></div></div>';

    container.innerHTML = html;

    document.getElementById('mr-moderator-select').addEventListener('change', e => {
      performMetaRegression(e.target.value);
    });

    performMetaRegression(allModerators[0]);
  }

  function performMetaRegression(moderator) {
    const container = document.getElementById('meta-regression-content');
    const studies = computeEffectSizes();

    // Copy moderator values from original studies
    studies.forEach((s, i) => {
      if (state.studies[i][moderator] !== undefined) {
        s[moderator] = parseFloat(state.studies[i][moderator]);
      }
    });

    const mr = Stats.metaRegression(studies, moderator, state.tau2Method);

    if (!mr) {
      container.innerHTML += '<div class="alert alert-warning">Meta 回归失败，需要更多有效数据点。</div>';
      return;
    }

    let html = '<div class="card"><div class="card-header"><h3>Meta 回归结果</h3></div>';

    // Summary
    html += '<div class="result-grid">';
    html += `<div class="stat-card ${mr.p_beta1 < 0.05 ? 'danger' : 'success'}">
      <div class="label">斜率 (&beta;)</div>
      <div class="value">${mr.beta1.toFixed(4)}</div>
      <div class="sub">SE = ${mr.seBeta1.toFixed(4)}, p = ${Stats.formatP(mr.p_beta1)}</div>
    </div>`;
    html += `<div class="stat-card">
      <div class="label">截距</div>
      <div class="value">${mr.beta0.toFixed(4)}</div>
      <div class="sub">SE = ${mr.seBeta0.toFixed(4)}, p = ${Stats.formatP(mr.p_beta0)}</div>
    </div>`;
    html += `<div class="stat-card warning">
      <div class="label">R&sup2; (解释变异)</div>
      <div class="value">${mr.R2.toFixed(1)}%</div>
      <div class="sub">残余 &tau;&sup2; = ${mr.tau2.toFixed(4)}</div>
    </div>`;
    html += `<div class="stat-card purple">
      <div class="label">模型检验 (Q_m)</div>
      <div class="value">${mr.Q_moderator.toFixed(2)}</div>
      <div class="sub">df = 1, p = ${Stats.formatP(mr.Q_moderator_p)}</div>
    </div>`;
    html += '</div>';

    // Detailed table
    html += '<div class="inline-stats" style="margin-top: 16px;">';
    html += `<strong>协变量:</strong> ${moderator}<br>`;
    html += `<strong>回归方程:</strong> Effect = ${mr.beta0.toFixed(4)} + ${mr.beta1.toFixed(4)} × ${moderator}<br>`;
    html += `<strong>残余异质性 (Q_model):</strong> ${mr.Q_model.toFixed(2)} (df = ${mr.df}), p = ${Stats.formatP(mr.Q_model_p)}<br>`;
    html += `<strong>R&sup2;:</strong> ${mr.R2.toFixed(2)}% of heterogeneity explained<br>`;
    html += '</div>';

    html += '</div>';

    // Bubble plot
    html += '<div class="card"><div class="card-header"><h3>气泡图 (Bubble Plot)</h3></div>';
    html += '<div id="mr-bubble-container" class="plot-container"></div></div>';

    container.innerHTML += html;

    Plots.bubblePlot(document.getElementById('mr-bubble-container'), mr, moderator);
  }

  // ============================================================
  // Heterogeneity Page
  // ============================================================

  function renderHeterogeneity() {
    const container = document.getElementById('heterogeneity-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先录入数据。</div>';
      return;
    }

    const studies = computeEffectSizes();
    const result = state.model === 'random'
      ? Stats.randomEffect(studies, state.tau2Method)
      : Stats.fixedEffect(studies);

    if (!result) {
      container.innerHTML = '<div class="alert alert-danger">分析失败。</div>';
      return;
    }

    let html = '';

    // Heterogeneity statistics
    html += '<div class="card"><div class="card-header"><h3>异质性统计量</h3></div>';
    html += '<div class="result-grid">';
    html += `<div class="stat-card ${result.I2 > 50 ? 'danger' : 'success'}">
      <div class="label">I&sup2;</div>
      <div class="value">${result.I2.toFixed(1)}%</div>
      <div class="sub">${result.I2 < 25 ? '低异质性' : result.I2 < 50 ? '中等异质性' : '高异质性'}</div>
    </div>`;
    html += `<div class="stat-card warning">
      <div class="label">Cochran's Q</div>
      <div class="value">${result.Q.toFixed(2)}</div>
      <div class="sub">df = ${result.df}, p = ${Stats.formatP(result.Q_p)}</div>
    </div>`;
    if (state.model === 'random') {
      html += `<div class="stat-card purple">
        <div class="label">&tau;&sup2;</div>
        <div class="value">${(result.tau2 || 0).toFixed(4)}</div>
        <div class="sub">&tau; = ${(result.tau || 0).toFixed(4)}</div>
      </div>`;
    }
    html += `<div class="stat-card">
      <div class="label">H 统计量</div>
      <div class="value">${result.H.toFixed(3)}</div>
      <div class="sub">${result.H < 1.5 ? '低异质性' : result.H < 2 ? '中等异质性' : '高异质性'}</div>
    </div>`;
    html += '</div>';

    // Interpretation
    html += '<div class="alert ';
    if (result.I2 < 25) html += 'alert-success">异质性较低 (I&sup2; < 25%)，固定效应模型可能适用。';
    else if (result.I2 < 50) html += 'alert-warning">存在中等程度异质性 (25% ≤ I&sup2; < 50%)，建议使用随机效应模型。';
    else html += 'alert-danger">存在显著异质性 (I&sup2; ≥ 50%)，强烈建议使用随机效应模型，并探索异质性来源。';
    html += '</div>';

    // Detailed table
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    html += '<th>统计量</th><th>值</th><th>自由度</th><th>p 值</th><th>解释</th>';
    html += '</tr></thead><tbody>';
    html += `<tr><td>Cochran's Q</td><td>${result.Q.toFixed(4)}</td><td>${result.df}</td><td>${Stats.formatP(result.Q_p)}</td><td>${result.Q_p < 0.10 ? '存在显著异质性' : '无异质性证据'}</td></tr>`;
    html += `<tr><td>I&sup2;</td><td>${result.I2.toFixed(2)}%</td><td>-</td><td>-</td><td>${result.I2 < 25 ? '低' : result.I2 < 50 ? '中等' : '高'}异质性</td></tr>`;
    html += `<tr><td>H</td><td>${result.H.toFixed(4)}</td><td>-</td><td>-</td><td>-${result.H.toFixed(2)}</td></tr>`;
    if (state.model === 'random') {
      html += `<tr><td>&tau;&sup2; (${state.tau2Method})</td><td>${(result.tau2 || 0).toFixed(6)}</td><td>-</td><td>-</td><td>研究间方差</td></tr>`;
      html += `<tr><td>&tau;</td><td>${(result.tau || 0).toFixed(6)}</td><td>-</td><td>-</td><td>研究间标准差</td></tr>`;
    }
    html += '</tbody></table></div>';
    html += '</div>';

    // Galbraith plot
    html += '<div class="card"><div class="card-header"><h3>Galbraith (Radial) Plot</h3></div>';
    html += '<div id="galbraith-container" class="plot-container"></div></div>';

    // Baujat plot
    html += '<div class="card"><div class="card-header"><h3>Baujat Plot</h3></div>';
    html += '<div class="alert alert-info">Baujat 图显示每个研究对异质性和总体效应的贡献。右上角的研究可能是异质性的主要来源。</div>';
    html += '<div id="baujat-container" class="plot-container"></div></div>';

    container.innerHTML = html;

    Plots.galbraithPlot(document.getElementById('galbraith-container'), studies, result);
    Plots.baujatPlot(document.getElementById('baujat-container'), studies, result, state.model, state.tau2Method);
  }

  // ============================================================
  // Publication Bias Page
  // ============================================================

  function renderPubBias() {
    const container = document.getElementById('pub-bias-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先录入数据。</div>';
      return;
    }

    const studies = computeEffectSizes();
    const result = state.model === 'random'
      ? Stats.randomEffect(studies, state.tau2Method)
      : Stats.fixedEffect(studies);

    if (!result) {
      container.innerHTML = '<div class="alert alert-danger">分析失败。</div>';
      return;
    }

    let html = '';

    // Funnel plot
    html += '<div class="card"><div class="card-header"><h3>漏斗图 (Funnel Plot)</h3>';
    html += '<div class="plot-controls">';
    html += '<label class="toggle"><input type="checkbox" id="show-trimfill" checked> 显示 Trim & Fill</label>';
    html += '<label class="toggle"><input type="checkbox" id="show-egger-line" checked> 显示 Egger 回归线</label>';
    html += '</div>';
    html += '</div>';
    html += '<div id="funnel-container" class="plot-container"></div></div>';

    // Egger's test
    const egger = Stats.eggerTest(studies);
    if (egger) {
      html += '<div class="card"><div class="card-header"><h3>Egger 回归检验</h3>';
      html += `<span class="badge ${egger.p_intercept < 0.05 ? 'badge-red' : 'badge-green'}">p = ${Stats.formatP(egger.p_intercept)}</span></div>`;
      html += '<div class="result-grid">';
      html += `<div class="stat-card ${egger.p_intercept < 0.05 ? 'danger' : 'success'}">
        <div class="label">截距</div>
        <div class="value">${egger.intercept.toFixed(4)}</div>
        <div class="sub">SE = ${egger.se_intercept.toFixed(4)}</div>
      </div>`;
      html += `<div class="stat-card">
        <div class="label">t 统计量</div>
        <div class="value">${egger.t_intercept.toFixed(3)}</div>
        <div class="sub">df = ${egger.df}</div>
      </div>`;
      html += `<div class="stat-card ${egger.p_intercept < 0.05 ? 'danger' : 'success'}">
        <div class="label">p 值</div>
        <div class="value">${Stats.formatP(egger.p_intercept)}</div>
        <div class="sub">${egger.p_intercept < 0.05 ? '存在发表偏倚' : '无显著发表偏倚'}</div>
      </div>`;
      html += `<div class="stat-card warning">
        <div class="label">斜率</div>
        <div class="value">${egger.slope.toFixed(4)}</div>
        <div class="sub">SE = ${egger.se_slope.toFixed(4)}</div>
      </div>`;
      html += '</div>';

      html += '<div class="alert ';
      html += egger.p_intercept < 0.05 ? 'alert-danger">' : 'alert-success">';
      html += egger.p_intercept < 0.05
        ? '<strong>Egger 检验结果显著 (p < 0.05)</strong>，提示可能存在发表偏倚或小样本效应。'
        : '<strong>Egger 检验结果不显著 (p ≥ 0.05)</strong>，未发现明显的发表偏倚。';
      html += '</div></div>';
    }

    // Begg's test
    const begg = Stats.beggTest(studies);
    if (begg) {
      html += '<div class="card"><div class="card-header"><h3>Begg 秩相关检验</h3>';
      html += `<span class="badge ${begg.p < 0.05 ? 'badge-red' : 'badge-green'}">p = ${Stats.formatP(begg.p)}</span></div>`;
      html += '<div class="result-grid">';
      html += `<div class="stat-card">
        <div class="label">Kendall's tau</div>
        <div class="value">${begg.tau.toFixed(4)}</div>
      </div>`;
      html += `<div class="stat-card">
        <div class="label">Z 统计量</div>
        <div class="value">${begg.z.toFixed(3)}</div>
      </div>`;
      html += `<div class="stat-card ${begg.p < 0.05 ? 'danger' : 'success'}">
        <div class="label">p 值</div>
        <div class="value">${Stats.formatP(begg.p)}</div>
        <div class="sub">${begg.p < 0.05 ? '存在发表偏倚' : '无显著发表偏倚'}</div>
      </div>`;
      html += '</div></div>';
    }

    // Trim and Fill
    const tf = Stats.trimAndFill(studies);
    if (tf) {
      const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(state.measure);
      const transform = (x) => expScale ? Math.exp(x) : x;

      html += '<div class="card"><div class="card-header"><h3>Trim and Fill 分析</h3></div>';
      html += `<div class="alert alert-info">该方法通过填补缺失的研究来评估发表偏倚的影响。</div>`;
      html += '<div class="result-grid">';
      html += `<div class="stat-card">
        <div class="label">填补研究数</div>
        <div class="value">${tf.trimCount}</div>
        <div class="sub">方向: ${tf.side}</div>
      </div>`;
      html += `<div class="stat-card success">
        <div class="label">原始估计</div>
        <div class="value">${transform(tf.originalTE).toFixed(4)}</div>
        <div class="sub">CI: [${transform(tf.originalCI[0]).toFixed(4)}, ${transform(tf.originalCI[1]).toFixed(4)}]</div>
      </div>`;
      html += `<div class="stat-card warning">
        <div class="label">调整后估计</div>
        <div class="value">${transform(tf.adjustedTE).toFixed(4)}</div>
        <div class="sub">CI: [${transform(tf.adjustedCI[0]).toFixed(4)}, ${transform(tf.adjustedCI[1]).toFixed(4)}]</div>
      </div>`;
      html += '</div></div>';
    }

    container.innerHTML = html;

    // Render funnel plot
    function renderFunnel() {
      const showTF = document.getElementById('show-trimfill').checked;
      const showEgger = document.getElementById('show-egger-line').checked;
      Plots.funnelPlot(
        document.getElementById('funnel-container'),
        studies, result,
        {
          measure: state.measure,
          trimFill: showTF,
          trimFillResult: tf,
          egger: showEgger,
          eggerResult: egger
        }
      );
    }

    renderFunnel();

    document.getElementById('show-trimfill').addEventListener('change', renderFunnel);
    document.getElementById('show-egger-line').addEventListener('change', renderFunnel);
  }

  // ============================================================
  // Sensitivity Analysis Page
  // ============================================================

  function renderSensitivity() {
    const container = document.getElementById('sensitivity-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先录入数据。</div>';
      return;
    }

    const studies = computeEffectSizes();
    const result = state.model === 'random'
      ? Stats.randomEffect(studies, state.tau2Method)
      : Stats.fixedEffect(studies);

    if (!result) {
      container.innerHTML = '<div class="alert alert-danger">分析失败。</div>';
      return;
    }

    let html = '';

    // Leave-one-out
    const loo = Stats.leaveOneOut(studies, state.model, state.tau2Method);
    if (loo && loo.length > 0) {
      html += '<div class="card"><div class="card-header"><h3>留一法敏感性分析 (Leave-One-Out)</h3></div>';
      html += '<div class="alert alert-info">每次排除一个研究后重新计算合并效应量，评估单个研究对总体结果的影响。</div>';

      // Plot
      html += '<div id="loo-plot-container" class="plot-container"></div>';

      // Table
      html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
      html += '<th>排除的研究</th><th>合并效应量</th><th>95% CI</th><th>p</th><th>I&sup2;</th>';
      if (state.model === 'random') html += '<th>&tau;&sup2;</th>';
      html += '</tr></thead><tbody>';

      const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(state.measure);
      const transform = (x) => expScale ? Math.exp(x) : x;

      for (const r of loo) {
        const label = r.excluded.label || r.excluded.name || 'Study';
        html += `<tr>
          <td>${label}</td>
          <td>${transform(r.TE).toFixed(4)}</td>
          <td>[${transform(r.lower).toFixed(4)}, ${transform(r.upper).toFixed(4)}]</td>
          <td>${Stats.formatP(r.p)}</td>
          <td>${(r.I2 || 0).toFixed(1)}%</td>
          ${state.model === 'random' ? `<td>${(r.tau2 || 0).toFixed(4)}</td>` : ''}
        </tr>`;
      }
      html += '</tbody></table></div>';
      html += '</div>';
    }

    // Cumulative meta-analysis
    const cum = Stats.cumulativeMeta(studies, state.model, state.tau2Method, 'year');
    if (cum && cum.length > 0) {
      html += '<div class="card"><div class="card-header"><h3>累积 Meta 分析</h3></div>';
      html += '<div class="alert alert-info">按年份逐年累积合并，观察效应量的演变趋势。</div>';
      html += '<div id="cum-plot-container" class="plot-container"></div>';
      html += '</div>';
    }

    container.innerHTML = html;

    // Render plots
    if (loo && loo.length > 0) {
      Plots.sensitivityPlot(document.getElementById('loo-plot-container'), loo, result, state.measure);
    }
    if (cum && cum.length > 0) {
      Plots.cumulativePlot(document.getElementById('cum-plot-container'), cum, state.measure);
    }
  }

  // ============================================================
  // Diagnostic Test Meta-Analysis Page
  // ============================================================

  function renderDiagnostic() {
    const container = document.getElementById('diagnostic-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先在"数据输入"页面录入诊断试验数据 (TP/FP/FN/TN)。</div>';
      return;
    }

    if (state.dataType !== 'diagnostic') {
      container.innerHTML = '<div class="alert alert-warning">当前数据类型不是诊断试验数据。请在"数据输入"页面选择"诊断试验数据 (2x2表)"，或加载诊断示例数据集。</div>';
      return;
    }

    const studies = computeEffectSizes();
    if (studies.length === 0 || !studies.some(s => isFinite(s.logDOR))) {
      container.innerHTML = '<div class="alert alert-danger">无法计算诊断效应量，请检查 TP/FP/FN/TN 数据是否完整。</div>';
      return;
    }

    // Run full diagnostic meta-analysis
    const diag = Stats.diagnosticMeta(studies, state.model, state.tau2Method);

    if (!diag) {
      container.innerHTML = '<div class="alert alert-danger">诊断试验分析失败。</div>';
      return;
    }

    let html = '';

    // ---- Summary cards ----
    html += '<div class="result-grid">';

    // Pooled Sensitivity
    if (diag.pooledSe !== null) {
      html += `<div class="stat-card success">
        <div class="label">合并敏感度 (Se)</div>
        <div class="value">${(diag.pooledSe * 100).toFixed(1)}%</div>
        <div class="sub">95% CI: [${(diag.seCI.lower * 100).toFixed(1)}%, ${(diag.seCI.upper * 100).toFixed(1)}%]</div>
      </div>`;
    }

    // Pooled Specificity
    if (diag.pooledSp !== null) {
      html += `<div class="stat-card success">
        <div class="label">合并特异度 (Sp)</div>
        <div class="value">${(diag.pooledSp * 100).toFixed(1)}%</div>
        <div class="sub">95% CI: [${(diag.spCI.lower * 100).toFixed(1)}%, ${(diag.spCI.upper * 100).toFixed(1)}%]</div>
      </div>`;
    }

    // Pooled DOR
    if (diag.pooledDOR !== null) {
      html += `<div class="stat-card ${diag.dorResult.p < 0.05 ? 'danger' : ''}">
        <div class="label">合并诊断比值比 (DOR)</div>
        <div class="value">${diag.pooledDOR.toFixed(1)}</div>
        <div class="sub">95% CI: [${diag.dorCI.lower.toFixed(1)}, ${diag.dorCI.upper.toFixed(1)}]</div>
      </div>`;
    }

    // Pooled PLR
    if (diag.pooledPLR !== null) {
      html += `<div class="stat-card warning">
        <div class="label">合并阳性似然比 (PLR+)</div>
        <div class="value">${diag.pooledPLR.toFixed(2)}</div>
        <div class="sub">95% CI: [${diag.plrCI.lower.toFixed(2)}, ${diag.plrCI.upper.toFixed(2)}]</div>
      </div>`;
    }

    // Pooled NLR
    if (diag.pooledNLR !== null) {
      html += `<div class="stat-card warning">
        <div class="label">合并阴性似然比 (NLR-)</div>
        <div class="value">${diag.pooledNLR.toFixed(3)}</div>
        <div class="sub">95% CI: [${diag.nlrCI.lower.toFixed(3)}, ${diag.nlrCI.upper.toFixed(3)}]</div>
      </div>`;
    }

    // AUC
    if (diag.sroc) {
      html += `<div class="stat-card purple">
        <div class="label">SROC 曲线下面积 (AUC)</div>
        <div class="value">${diag.sroc.auc.toFixed(3)}</div>
        <div class="sub">Q* = ${diag.sroc.qStar.toFixed(3)}</div>
      </div>`;
    }

    // Heterogeneity
    if (diag.dorResult) {
      html += `<div class="stat-card ${diag.dorResult.I2 > 50 ? 'danger' : ''}">
        <div class="label">异质性 (I&sup2;)</div>
        <div class="value">${diag.dorResult.I2.toFixed(1)}%</div>
        <div class="sub">Q = ${diag.dorResult.Q.toFixed(2)}, p = ${Stats.formatP(diag.dorResult.Q_p)}</div>
      </div>`;
    }

    // Study count
    html += `<div class="stat-card">
      <div class="label">纳入研究数</div>
      <div class="value">${diag.k}</div>
      <div class="sub">模型: ${state.model === 'random' ? '随机效应' : '固定效应'}</div>
    </div>`;

    html += '</div>'; // end result-grid

    // ---- SROC Plot ----
    html += '<div class="card"><div class="card-header"><h3>SROC 曲线 (Summary ROC)</h3></div>';
    html += '<div class="alert alert-info">SROC 曲线综合展示各研究的敏感度与特异度关系，以及 Moses-Littenberg 回归拟合的汇总 ROC 曲线。红色实线为 SROC 曲线，深色圆点为汇总操作点，紫色菱形为 Q* 点。</div>';
    html += '<div id="sroc-plot-container" class="plot-container"></div>';
    html += '</div>';

    // ---- SROC Model Details ----
    if (diag.sroc) {
      html += '<div class="card"><div class="card-header"><h3>SROC 模型详情 (Moses-Littenberg)</h3></div>';
      html += '<div class="inline-stats">';
      html += `<strong>截距 (a):</strong> ${diag.sroc.a.toFixed(4)} (SE = ${diag.sroc.seA.toFixed(4)}, p = ${Stats.formatP(diag.sroc.pA)})<br>`;
      html += `<strong>斜率 (b):</strong> ${diag.sroc.b.toFixed(4)} (SE = ${diag.sroc.seB.toFixed(4)}, p = ${Stats.formatP(diag.sroc.pB)})<br>`;
      html += `<strong>对称性检验 (b=0):</strong> ${Math.abs(diag.sroc.b) < 0.1 ? 'SROC 曲线近似对称 (b ≈ 0)' : 'SROC 曲线不对称 (b ≠ 0)'}<br>`;
      html += `<strong>AUC:</strong> ${diag.sroc.auc.toFixed(4)} ${diag.sroc.auc > 0.7 ? '(良好判别力)' : diag.sroc.auc > 0.5 ? '(中等判别力)' : '(判别力较低)'}<br>`;
      html += `<strong>Q* 指数:</strong> ${diag.sroc.qStar.toFixed(4)} ${diag.sroc.seQStar ? '(SE = ' + diag.sroc.seQStar.toFixed(4) + ')' : ''}<br>`;
      html += `<strong>Q* 含义:</strong> 在 SROC 曲线上 Se = Sp 的点，代表最佳判别阈值<br>`;
      html += '</div></div>';
    }

    // ---- DOR Forest Plot ----
    html += '<div class="card"><div class="card-header"><h3>DOR 森林图 (诊断比值比)</h3>';
    html += '<div class="btn-group"><button class="btn btn-outline btn-sm" id="diag-toggle-model-btn">切换模型</button></div>';
    html += '</div>';
    html += '<div class="alert alert-info">诊断比值比 (DOR) 的森林图，展示各研究及合并后的 DOR (对数尺度)。</div>';
    html += '<div id="diag-forest-container" class="plot-container"></div>';
    html += '</div>';

    // ---- Individual Study Table ----
    html += '<div class="card"><div class="card-header"><h3>各研究诊断指标</h3></div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    html += '<th>#</th><th>研究</th><th>TP</th><th>FP</th><th>FN</th><th>TN</th>';
    html += '<th>Se [95%CI]</th><th>Sp [95%CI]</th>';
    html += '<th>DOR [95%CI]</th><th>PLR</th><th>NLR</th>';
    html += '</tr></thead><tbody>';

    studies.forEach((s, i) => {
      html += '<tr>';
      html += `<td class="study-row-num">${i + 1}</td>`;
      html += `<td>${s.label || s.name || 'Study ' + (i + 1)}</td>`;
      html += `<td>${s.TP}</td><td>${s.FP}</td><td>${s.FN}</td><td>${s.TN}</td>`;
      if (isFinite(s.sensitivity)) {
        html += `<td>${(s.sensitivity * 100).toFixed(1)}% [${(s.seCI[0] * 100).toFixed(1)}, ${(s.seCI[1] * 100).toFixed(1)}]</td>`;
      } else {
        html += '<td>-</td>';
      }
      if (isFinite(s.specificity)) {
        html += `<td>${(s.specificity * 100).toFixed(1)}% [${(s.spCI[0] * 100).toFixed(1)}, ${(s.spCI[1] * 100).toFixed(1)}]</td>`;
      } else {
        html += '<td>-</td>';
      }
      if (isFinite(s.dor)) {
        html += `<td>${s.dor.toFixed(1)} [${s.dorCI[0].toFixed(1)}, ${s.dorCI[1].toFixed(1)}]</td>`;
      } else {
        html += '<td>-</td>';
      }
      html += `<td>${isFinite(s.plr) ? s.plr.toFixed(2) : '-'}</td>`;
      html += `<td>${isFinite(s.nlr) ? s.nlr.toFixed(3) : '-'}</td>`;
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    html += '</div>';

    // ---- Heterogeneity Details ----
    if (diag.dorResult) {
      html += '<div class="card"><div class="card-header"><h3>异质性评估 (基于 log DOR)</h3></div>';
      html += '<div class="inline-stats">';
      html += `<strong>模型:</strong> ${state.model === 'random' ? '随机效应模型' : '固定效应模型'}<br>`;
      html += `<strong>Cochran's Q:</strong> ${diag.dorResult.Q.toFixed(4)} (df = ${diag.dorResult.df}, p = ${Stats.formatP(diag.dorResult.Q_p)})<br>`;
      html += `<strong>I&sup2;:</strong> ${diag.dorResult.I2.toFixed(2)}%<br>`;
      html += `<strong>H 统计量:</strong> ${diag.dorResult.H.toFixed(4)}<br>`;
      if (state.model === 'random' && diag.dorResult.tau2 !== undefined) {
        html += `<strong>&tau;&sup2;:</strong> ${diag.dorResult.tau2.toFixed(6)}<br>`;
        html += `<strong>&tau;:</strong> ${diag.dorResult.tau.toFixed(6)}<br>`;
      }
      html += '</div>';

      const hetLevel = diag.dorResult.I2 < 25 ? 'success' :
        diag.dorResult.I2 < 50 ? 'warning' : 'danger';
      const hetMsg = diag.dorResult.I2 < 25 ? '异质性较低 (I&sup2; < 25%)。各研究结果一致性较好。' :
        diag.dorResult.I2 < 50 ? '存在中等程度异质性 (25% ≤ I&sup2; < 50%)。' :
        '存在显著异质性 (I&sup2; ≥ 50%)，需谨慎解释合并结果。';
      html += `<div class="alert alert-${hetLevel}">${hetMsg}</div>`;
      html += '</div>';
    }

    // ---- Pooled Measures Detail ----
    html += '<div class="card"><div class="card-header"><h3>合并诊断指标汇总</h3></div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    html += '<th>指标</th><th>合并值</th><th>95% CI</th><th>Z</th><th>p</th><th>异质性 I&sup2;</th>';
    html += '</tr></thead><tbody>';

    if (diag.dorResult) {
      html += `<tr>
        <td><strong>DOR</strong></td>
        <td>${diag.pooledDOR.toFixed(2)}</td>
        <td>[${diag.dorCI.lower.toFixed(2)}, ${diag.dorCI.upper.toFixed(2)}]</td>
        <td>${diag.dorResult.z.toFixed(3)}</td>
        <td>${Stats.formatP(diag.dorResult.p)}</td>
        <td>${diag.dorResult.I2.toFixed(1)}%</td>
      </tr>`;
    }
    if (diag.seResult && diag.pooledSe !== null) {
      html += `<tr>
        <td><strong>敏感度 (Se)</strong></td>
        <td>${(diag.pooledSe * 100).toFixed(1)}%</td>
        <td>[${(diag.seCI.lower * 100).toFixed(1)}%, ${(diag.seCI.upper * 100).toFixed(1)}%]</td>
        <td>${diag.seResult.z.toFixed(3)}</td>
        <td>${Stats.formatP(diag.seResult.p)}</td>
        <td>${diag.seResult.I2.toFixed(1)}%</td>
      </tr>`;
    }
    if (diag.spResult && diag.pooledSp !== null) {
      html += `<tr>
        <td><strong>特异度 (Sp)</strong></td>
        <td>${(diag.pooledSp * 100).toFixed(1)}%</td>
        <td>[${(diag.spCI.lower * 100).toFixed(1)}%, ${(diag.spCI.upper * 100).toFixed(1)}%]</td>
        <td>${diag.spResult.z.toFixed(3)}</td>
        <td>${Stats.formatP(diag.spResult.p)}</td>
        <td>${diag.spResult.I2.toFixed(1)}%</td>
      </tr>`;
    }
    if (diag.plrResult && diag.pooledPLR !== null) {
      html += `<tr>
        <td><strong>PLR+</strong></td>
        <td>${diag.pooledPLR.toFixed(2)}</td>
        <td>[${diag.plrCI.lower.toFixed(2)}, ${diag.plrCI.upper.toFixed(2)}]</td>
        <td>${diag.plrResult.z.toFixed(3)}</td>
        <td>${Stats.formatP(diag.plrResult.p)}</td>
        <td>${diag.plrResult.I2.toFixed(1)}%</td>
      </tr>`;
    }
    if (diag.nlrResult && diag.pooledNLR !== null) {
      html += `<tr>
        <td><strong>NLR-</strong></td>
        <td>${diag.pooledNLR.toFixed(3)}</td>
        <td>[${diag.nlrCI.lower.toFixed(3)}, ${diag.nlrCI.upper.toFixed(3)}]</td>
        <td>${diag.nlrResult.z.toFixed(3)}</td>
        <td>${Stats.formatP(diag.nlrResult.p)}</td>
        <td>${diag.nlrResult.I2.toFixed(1)}%</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
    html += '</div>';

    // ---- Interpretation ----
    html += '<div class="card"><div class="card-header"><h3>结果解读</h3></div>';
    html += '<div class="inline-stats">';

    if (diag.pooledSe !== null && diag.pooledSp !== null) {
      html += `<strong>诊断准确性:</strong> 合并敏感度 ${(diag.pooledSe * 100).toFixed(1)}%，合并特异度 ${(diag.pooledSp * 100).toFixed(1)}%。`;
      if (diag.pooledSe > 0.8 && diag.pooledSp > 0.8) {
        html += '该诊断试验具有较高的敏感度和特异度，诊断准确性良好。<br>';
      } else if (diag.pooledSe > 0.7 || diag.pooledSp > 0.7) {
        html += '该诊断试验具有中等诊断准确性。<br>';
      } else {
        html += '该诊断试验的诊断准确性有限。<br>';
      }
    }

    if (diag.pooledDOR !== null) {
      html += `<strong>诊断比值比 (DOR):</strong> ${diag.pooledDOR.toFixed(1)}。`;
      if (diag.pooledDOR > 25) {
        html += 'DOR > 25，提示该试验具有较好的排除和确诊能力。<br>';
      } else if (diag.pooledDOR > 1) {
        html += 'DOR > 1，提示该试验具有一定的判别能力。<br>';
      } else {
        html += 'DOR ≤ 1，提示该试验判别能力有限。<br>';
      }
    }

    if (diag.pooledPLR !== null) {
      html += `<strong>阳性似然比 (PLR+):</strong> ${diag.pooledPLR.toFixed(2)}。`;
      if (diag.pooledPLR > 10) {
        html += 'PLR > 10，阳性结果可大幅提高确诊概率。<br>';
      } else if (diag.pooledPLR > 3) {
        html += 'PLR > 3，阳性结果对确诊有一定帮助。<br>';
      } else {
        html += 'PLR ≤ 3，阳性结果对确诊帮助有限。<br>';
      }
    }

    if (diag.pooledNLR !== null) {
      html += `<strong>阴性似然比 (NLR-):</strong> ${diag.pooledNLR.toFixed(3)}。`;
      if (diag.pooledNLR < 0.1) {
        html += 'NLR < 0.1，阴性结果可大幅降低患病概率。<br>';
      } else if (diag.pooledNLR < 0.3) {
        html += 'NLR < 0.3，阴性结果对排除有一定帮助。<br>';
      } else {
        html += 'NLR ≥ 0.3，阴性结果对排除帮助有限。<br>';
      }
    }

    if (diag.sroc) {
      html += `<strong>SROC AUC:</strong> ${diag.sroc.auc.toFixed(3)}。`;
      if (diag.sroc.auc > 0.9) {
        html += 'AUC > 0.9，诊断能力优秀。<br>';
      } else if (diag.sroc.auc > 0.7) {
        html += 'AUC > 0.7，诊断能力良好。<br>';
      } else if (diag.sroc.auc > 0.5) {
        html += 'AUC > 0.5，诊断能力尚可。<br>';
      } else {
        html += 'AUC ≤ 0.5，诊断能力差。<br>';
      }
    }

    html += '</div></div>';

    // Render to DOM
    container.innerHTML = html;

    // Render SROC plot
    Plots.srocPlot(
      document.getElementById('sroc-plot-container'),
      studies, diag,
      { showCurve: true, showSummary: true, showQStar: true, showCI: true }
    );

    // Render DOR forest plot
    const dorStudies = studies.map(s => ({
      TE: s.logDOR, seTE: s.seLogDOR,
      label: s.label || s.name || 'Study'
    })).filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);

    Plots.forestPlot(
      document.getElementById('diag-forest-container'),
      dorStudies, diag.dorResult,
      { measure: 'DOR', studyNames: dorStudies.map(s => s.label) }
    );

    // Toggle model button
    const toggleBtn = document.getElementById('diag-toggle-model-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        state.model = state.model === 'random' ? 'fixed' : 'random';
        document.getElementById('model-select').value = state.model;
        document.getElementById('tau2-method-group').style.display = state.model === 'random' ? '' : 'none';
        renderDiagnostic();
      });
    }
  }

  // ============================================================
  // Report Page
  // ============================================================

  function renderReport() {
    const container = document.getElementById('report-content');

    if (state.studies.length === 0) {
      container.innerHTML = '<div class="alert alert-info">请先录入数据。</div>';
      return;
    }

    const studies = computeEffectSizes();
    const result = state.model === 'random'
      ? Stats.randomEffect(studies, state.tau2Method)
      : Stats.fixedEffect(studies);

    if (!result) {
      container.innerHTML = '<div class="alert alert-danger">分析失败。</div>';
      return;
    }

    const egger = Stats.eggerTest(studies);
    const begg = Stats.beggTest(studies);
    const tf = Stats.trimAndFill(studies);

    const expScale = ['OR', 'RR', 'HR', 'DOR'].includes(state.measure);
    const transform = (x) => expScale ? Math.exp(x) : x;
    const tr = Stats.expTransform(result.TE, result.seTE, result.lower, result.upper, state.measure);

    let html = '<div class="card">';

    // Title
    html += '<div style="text-align:center; margin-bottom: 24px;">';
    html += '<h2 style="font-size: 22px; color: #2c3e50;">Meta 分析报告</h2>';
    html += '<p style="color: #7f8c8d; font-size: 13px;">生成时间: ' + new Date().toLocaleString('zh-CN') + '</p>';
    html += '</div>';

    // 1. Study overview
    html += '<div class="card-header"><h3>1. 研究概况</h3></div>';
    html += '<div class="inline-stats">';
    html += `<strong>纳入研究数:</strong> ${studies.length}<br>`;
    html += `<strong>数据类型:</strong> ${state.dataType}<br>`;
    html += `<strong>效应量指标:</strong> ${state.measure}<br>`;
    html += `<strong>分析模型:</strong> ${state.model === 'random' ? '随机效应模型' : '固定效应模型'}<br>`;
    if (state.model === 'random') {
      html += `<strong>&tau;&sup2; 估计方法:</strong> ${state.tau2Method}<br>`;
    }
    html += `<strong>置信水平:</strong> ${(state.ciLevel * 100).toFixed(0)}%<br>`;
    html += '</div>';

    // 2. Main results
    html += '<div class="card-header" style="margin-top: 20px;"><h3>2. 主要结果</h3></div>';
    html += '<div class="result-grid">';
    html += `<div class="stat-card">
      <div class="label">合并效应量</div>
      <div class="value">${tr.estimate.toFixed(3)}</div>
      <div class="sub">95% CI: [${tr.lower.toFixed(3)}, ${tr.upper.toFixed(3)}]</div>
    </div>`;
    html += `<div class="stat-card ${result.p < 0.05 ? 'danger' : 'success'}">
      <div class="label">Z 检验 p 值</div>
      <div class="value">${Stats.formatP(result.p)}</div>
      <div class="sub">Z = ${result.z.toFixed(3)}</div>
    </div>`;
    html += `<div class="stat-card ${result.I2 > 50 ? 'danger' : 'warning'}">
      <div class="label">I&sup2;</div>
      <div class="value">${result.I2.toFixed(1)}%</div>
      <div class="sub">Q = ${result.Q.toFixed(2)}, p = ${Stats.formatP(result.Q_p)}</div>
    </div>`;
    if (state.model === 'random') {
      html += `<div class="stat-card purple">
        <div class="label">&tau;&sup2;</div>
        <div class="value">${(result.tau2 || 0).toFixed(4)}</div>
        <div class="sub">&tau; = ${(result.tau || 0).toFixed(4)}</div>
      </div>`;
    }
    html += '</div>';

    // 3. Heterogeneity
    html += '<div class="card-header" style="margin-top: 20px;"><h3>3. 异质性评估</h3></div>';
    html += '<div class="inline-stats">';
    html += `<strong>Cochran's Q:</strong> ${result.Q.toFixed(4)} (df = ${result.df}, p = ${Stats.formatP(result.Q_p)})<br>`;
    html += `<strong>I&sup2;:</strong> ${result.I2.toFixed(2)}%<br>`;
    html += `<strong>H:</strong> ${result.H.toFixed(4)}<br>`;
    if (state.model === 'random') {
      html += `<strong>&tau;&sup2;:</strong> ${(result.tau2 || 0).toFixed(6)}<br>`;
      html += `<strong>&tau;:</strong> ${(result.tau || 0).toFixed(6)}<br>`;
    }
    html += '</div>';
    html += '<div class="alert ';
    if (result.I2 < 25) html += 'alert-success">异质性较低 (I&sup2; < 25%)';
    else if (result.I2 < 50) html += 'alert-warning">存在中等程度异质性';
    else html += 'alert-danger">存在显著异质性';
    html += '</div>';

    // 4. Publication bias
    html += '<div class="card-header" style="margin-top: 20px;"><h3>4. 发表偏倚检验</h3></div>';
    html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
    html += '<th>检验方法</th><th>统计量</th><th>p 值</th><th>结论</th>';
    html += '</tr></thead><tbody>';

    if (egger) {
      html += `<tr>
        <td>Egger 回归检验</td>
        <td>t = ${egger.t_intercept.toFixed(3)}, 截距 = ${egger.intercept.toFixed(4)}</td>
        <td>${Stats.formatP(egger.p_intercept)}</td>
        <td>${egger.p_intercept < 0.05 ? '可能存在发表偏倚' : '无明显发表偏倚'}</td>
      </tr>`;
    }
    if (begg) {
      html += `<tr>
        <td>Begg 秩相关检验</td>
        <td>tau = ${begg.tau.toFixed(4)}, z = ${begg.z.toFixed(3)}</td>
        <td>${Stats.formatP(begg.p)}</td>
        <td>${begg.p < 0.05 ? '可能存在发表偏倚' : '无明显发表偏倚'}</td>
      </tr>`;
    }
    if (tf) {
      html += `<tr>
        <td>Trim and Fill</td>
        <td>填补 ${tf.trimCount} 个研究</td>
        <td>-</td>
        <td>调整后效应: ${transform(tf.adjustedTE).toFixed(4)} [${transform(tf.adjustedCI[0]).toFixed(4)}, ${transform(tf.adjustedCI[1]).toFixed(4)}]</td>
      </tr>`;
    }
    html += '</tbody></table></div>';

    // 5. Forest plot
    html += '<div class="card-header" style="margin-top: 20px;"><h3>5. 森林图</h3></div>';
    html += '<div id="report-forest-container" class="plot-container"></div>';

    // 6. Funnel plot
    html += '<div class="card-header" style="margin-top: 20px;"><h3>6. 漏斗图</h3></div>';
    html += '<div id="report-funnel-container" class="plot-container"></div>';

    // 7. Diagnostic test section (if diagnostic data)
    if (state.dataType === 'diagnostic') {
      const diagReport = Stats.diagnosticMeta(studies, state.model, state.tau2Method);
      if (diagReport) {
        html += '<div class="card-header" style="margin-top: 20px;"><h3>7. 诊断试验 Meta 分析</h3></div>';
        html += '<div class="result-grid">';
        if (diagReport.pooledSe !== null) {
          html += `<div class="stat-card success"><div class="label">合并敏感度</div><div class="value">${(diagReport.pooledSe * 100).toFixed(1)}%</div><div class="sub">95% CI: [${(diagReport.seCI.lower * 100).toFixed(1)}%, ${(diagReport.seCI.upper * 100).toFixed(1)}%]</div></div>`;
        }
        if (diagReport.pooledSp !== null) {
          html += `<div class="stat-card success"><div class="label">合并特异度</div><div class="value">${(diagReport.pooledSp * 100).toFixed(1)}%</div><div class="sub">95% CI: [${(diagReport.spCI.lower * 100).toFixed(1)}%, ${(diagReport.spCI.upper * 100).toFixed(1)}%]</div></div>`;
        }
        if (diagReport.pooledDOR !== null) {
          html += `<div class="stat-card"><div class="label">合并 DOR</div><div class="value">${diagReport.pooledDOR.toFixed(1)}</div><div class="sub">95% CI: [${diagReport.dorCI.lower.toFixed(1)}, ${diagReport.dorCI.upper.toFixed(1)}]</div></div>`;
        }
        if (diagReport.pooledPLR !== null) {
          html += `<div class="stat-card warning"><div class="label">合并 PLR+</div><div class="value">${diagReport.pooledPLR.toFixed(2)}</div><div class="sub">95% CI: [${diagReport.plrCI.lower.toFixed(2)}, ${diagReport.plrCI.upper.toFixed(2)}]</div></div>`;
        }
        if (diagReport.pooledNLR !== null) {
          html += `<div class="stat-card warning"><div class="label">合并 NLR-</div><div class="value">${diagReport.pooledNLR.toFixed(3)}</div><div class="sub">95% CI: [${diagReport.nlrCI.lower.toFixed(3)}, ${diagReport.nlrCI.upper.toFixed(3)}]</div></div>`;
        }
        if (diagReport.sroc) {
          html += `<div class="stat-card purple"><div class="label">SROC AUC</div><div class="value">${diagReport.sroc.auc.toFixed(3)}</div><div class="sub">Q* = ${diagReport.sroc.qStar.toFixed(3)}</div></div>`;
        }
        html += '</div>';

        // SROC plot in report
        html += '<div class="card-header" style="margin-top: 16px;"><h3>SROC 曲线</h3></div>';
        html += '<div id="report-sroc-container" class="plot-container"></div>';
      }
    }

    html += '</div>';

    container.innerHTML = html;

    // Render plots
    Plots.forestPlot(
      document.getElementById('report-forest-container'),
      studies, result,
      { measure: state.measure, studyNames: studies.map(s => s.label || s.name || 'Study') }
    );

    Plots.funnelPlot(
      document.getElementById('report-funnel-container'),
      studies, result,
      { measure: state.measure, trimFill: tf !== null, trimFillResult: tf }
    );

    // Render SROC plot in report if diagnostic
    if (state.dataType === 'diagnostic') {
      const srocContainer = document.getElementById('report-sroc-container');
      if (srocContainer) {
        const diagReport = Stats.diagnosticMeta(studies, state.model, state.tau2Method);
        if (diagReport) {
          Plots.srocPlot(srocContainer, studies, diagReport, { showCI: true });
        }
      }
    }

    // Export HTML button
    document.getElementById('export-html-btn').onclick = exportReport;
  }

  function exportReport() {
    const content = document.getElementById('report-content').innerHTML;
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Meta 分析报告</title>
<style>${document.querySelector('style')?.textContent || ''}</style>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="main-content">${content}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meta-analysis-report.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // Tabs
  // ============================================================

  function initTabs(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${target}`)?.classList.add('active');

        if (target === 'manual') {
          renderManualInputTable();
        }
      });
    });
  }

  // ============================================================
  // Init
  // ============================================================

  function init() {
    initNavigation();
    initDataInput();
  }

  return {
    init,
    state,
    computeEffectSizes
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
