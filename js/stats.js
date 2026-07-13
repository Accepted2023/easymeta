/**
 * Meta-Analysis Statistical Engine
 * Core statistical computations for meta-analysis
 */

const Stats = (function () {
  'use strict';

  // ============================================================
  // 1. Basic Distribution Functions
  // ============================================================

  // Standard Normal PDF
  function normalPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  // Standard Normal CDF using error function
  function normalCDF(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
  }

  // Complementary error function approximation
  function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 +
      t * (0.09678418 + t * (-0.18628806 + t * (0.27884407 + t * (-1.13520398 +
      t * (1.48851587 + t * (-0.82215223 + t * 0.17087299)))))))));
    return x >= 0 ? r : 2 - r;
  }

  // Error function
  function erf(x) {
    return 1 - erfc(x);
  }

  // Inverse Standard Normal CDF (Acklam's algorithm)
  function inverseNormalCDF(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;

    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
      1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
      6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
      -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
      3.754408661907416e+00];

    let q, r, y;

    if (p < 0.02425) {
      q = Math.sqrt(-2 * Math.log(p));
      y = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else {
      q = p - 0.5;
      r = q * q;
      y = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }

    // One Halley step for refinement
    const e = normalCDF(y) - p;
    const u = e / (normalPDF(y) || 1e-300);
    y = y - u / (1 + 0.5 * y * u);

    return y;
  }

  // Incomplete gamma function (lower) via series expansion
  function lowerGamma(s, x) {
    if (x < 0) return 0;
    if (x === 0) return 0;
    const gln = logGamma(s);
    let ap = s;
    let sum = 1 / s;
    let del = sum;
    for (let n = 0; n < 200; n++) {
      ap++;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - gln);
  }

  // Regularized upper incomplete gamma Q(s,x) = 1 - P(s,x)
  function upperGammaQ(s, x) {
    if (x < 0 || s <= 0) return 1;
    if (x === 0) return 1;
    const gln = logGamma(s);

    // Use continued fraction for x >= s+1
    if (x >= s + 1) {
      let b = x + 1 - s;
      let c = 1e300;
      let d = 1 / b;
      let h = d;
      for (let i = 1; i <= 200; i++) {
        const an = -i * (i - s);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-300) d = 1e-300;
        c = b + an / c;
        if (Math.abs(c) < 1e-300) c = 1e-300;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < 1e-12) break;
      }
      return Math.exp(-x + s * Math.log(x) - gln) * h;
    }

    // Use series expansion for x < s+1
    return 1 - lowerGamma(s, x);
  }

  // Log Gamma function (Lanczos approximation)
  function logGamma(x) {
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    x -= 1;
    let a = c[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) {
      a += c[i] / (x + i);
    }
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  // Chi-square CDF: P(df, x) = lower incomplete gamma(df/2, x/2) / Gamma(df/2)
  function chiSquareCDF(x, df) {
    if (x <= 0) return 0;
    return lowerGamma(df / 2, x / 2);
  }

  // Chi-square survival (1 - CDF)
  function chiSquareSF(x, df) {
    return 1 - chiSquareCDF(x, df);
  }

  // Chi-square inverse CDF (quantile function)
  function inverseChiSquareCDF(p, df) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    // Use Newton-Raphson with bisection fallback
    let x = df * Math.pow(p, 2 / df); // initial guess
    for (let iter = 0; iter < 100; iter++) {
      const cdf = chiSquareCDF(x, df);
      const pdf = (x > 0) ? Math.exp(-x / 2 + (df / 2 - 1) * Math.log(x / 2) - logGamma(df / 2)) / 2 : 0;
      if (pdf < 1e-300) break;
      const diff = cdf - p;
      if (Math.abs(diff) < 1e-10) break;
      x = x - diff / pdf;
      if (x <= 0) x = 0.001;
    }
    return x;
  }

  // Incomplete Beta function via continued fraction
  function incompleteBeta(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const lbeta = logGamma(a + b) - logGamma(a) - logGamma(b);
    const front = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));

    if (x < (a + 1) / (a + b + 2)) {
      return front * betaCF(a, b, x) / a;
    } else {
      return 1 - front * betaCF(b, a, 1 - x) / b;
    }
  }

  function betaCF(a, b, x) {
    const maxIter = 200;
    const epsilon = 1e-12;
    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      h *= d * c;

      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < epsilon) break;
    }
    return h;
  }

  // t-distribution CDF
  function tCDF(t, df) {
    if (df <= 0) return NaN;
    const x = df / (df + t * t);
    const ib = incompleteBeta(df / 2, 0.5, x);
    return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
  }

  // t-distribution survival function (two-tailed)
  function tTwoTailed(t, df) {
    return 2 * (1 - tCDF(Math.abs(t), df));
  }

  // t-distribution inverse CDF (quantile)
  function inverseTCDF(p, df) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (df > 200) return inverseNormalCDF(p); // approximate with normal for large df

    // Use normal as starting point
    let t = inverseNormalCDF(p);
    for (let iter = 0; iter < 100; iter++) {
      const cdf = tCDF(t, df);
      const pdf = Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df));
      if (pdf < 1e-300) break;
      const diff = cdf - p;
      if (Math.abs(diff) < 1e-10) break;
      t = t - diff / pdf;
    }
    return t;
  }

  // F-distribution CDF
  function fCDF(f, df1, df2) {
    if (f <= 0) return 0;
    const x = df2 / (df2 + df1 * f);
    return 1 - incompleteBeta(df2 / 2, df1 / 2, x);
  }

  // F-distribution survival function
  function fSF(f, df1, df2) {
    return 1 - fCDF(f, df1, df2);
  }

  // ============================================================
  // 2. Effect Size Calculations
  // ============================================================

  /**
   * Calculate effect sizes for binary outcomes (2x2 table)
   * @param {Object} study - { events_t, total_t, events_c, total_c }
   * @param {string} measure - 'OR', 'RR', 'RD'
   * @returns {Object} { TE, seTE } - log effect size and its standard error
   */
  function calcBinaryEffect(study, measure) {
    const a = study.events_t;
    const b = study.total_t - study.events_t;
    const c = study.events_c;
    const d = study.total_c - study.events_c;

    // Add continuity correction for zero cells
    const hasZero = (a === 0 || b === 0 || c === 0 || d === 0);
    const cc = 0.5;
    const a2 = hasZero ? a + cc : a;
    const b2 = hasZero ? b + cc : b;
    const c2 = hasZero ? c + cc : c;
    const d2 = hasZero ? d + cc : d;

    let TE, seTE;

    switch (measure) {
      case 'OR':
        TE = Math.log((a2 * d2) / (b2 * c2));
        seTE = Math.sqrt(1 / a2 + 1 / b2 + 1 / c2 + 1 / d2);
        break;
      case 'RR':
        const riskT = a2 / (a2 + b2);
        const riskC = c2 / (c2 + d2);
        TE = Math.log(riskT / riskC);
        seTE = Math.sqrt(1 / a2 - 1 / (a2 + b2) + 1 / c2 - 1 / (c2 + d2));
        break;
      case 'RD':
        const rt = a / study.total_t;
        const rc = c / study.total_c;
        TE = rt - rc;
        seTE = Math.sqrt(rt * (1 - rt) / study.total_t + rc * (1 - rc) / study.total_c);
        break;
      default:
        throw new Error('Unknown binary measure: ' + measure);
    }

    return { TE, seTE, measure, hasContinuityCorrection: hasZero };
  }

  /**
   * Calculate effect sizes for continuous outcomes
   * @param {Object} study - { mean_t, sd_t, n_t, mean_c, sd_c, n_c }
   * @param {string} measure - 'MD', 'SMD'
   * @returns {Object} { TE, seTE }
   */
  function calcContinuousEffect(study, measure) {
    const mt = study.mean_t, sdt = study.sd_t, nt = study.n_t;
    const mc = study.mean_c, sdc = study.sd_c, nc = study.n_c;

    let TE, seTE;

    switch (measure) {
      case 'MD':
        TE = mt - mc;
        seTE = Math.sqrt(sdt * sdt / nt + sdc * sdc / nc);
        break;
      case 'SMD':
        // Hedges' g (with small sample correction)
        // Pooled SD
        const sPool = Math.sqrt(((nt - 1) * sdt * sdt + (nc - 1) * sdc * sdc) / (nt + nc - 2));
        const d = (mt - mc) / sPool;
        // Hedges correction factor J
        const df = nt + nc - 2;
        const J = 1 - 3 / (4 * df - 1);
        const g = d * J;
        TE = g;
        // SE of SMD
        const var_d = (nt + nc) / (nt * nc) + d * d / (2 * (nt + nc));
        const var_g = J * J * var_d;
        seTE = Math.sqrt(var_g);
        break;
      default:
        throw new Error('Unknown continuous measure: ' + measure);
    }

    return { TE, seTE, measure };
  }

  /**
   * Calculate effect size from correlation data
   * Uses Fisher's z transformation
   * @param {Object} study - { r, n }
   */
  function calcCorrEffect(study) {
    const r = Math.max(-0.9999, Math.min(0.9999, study.r));
    const z = 0.5 * Math.log((1 + r) / (1 - r));
    const seTE = 1 / Math.sqrt(study.n - 3);
    return { TE: z, seTE, measure: 'CORR', r: r };
  }

  /**
   * Calculate effect size from a single group proportion
   * Uses logit transformation
   * @param {Object} study - { events, total }
   */
  function calcProportionEffect(study) {
    const p = study.events / study.total;
    const cc = 0.5;
    const p2 = (study.events + cc) / (study.total + 2 * cc);
    const TE = Math.log(p2 / (1 - p2)); // logit
    const seTE = 1 / Math.sqrt(study.events + 0.5) + 0; // approximate
    const seTE2 = Math.sqrt(1 / (study.events + 0.5) + 1 / (study.total - study.events + 0.5));
    return { TE, seTE: seTE2, measure: 'PROP', proportion: p };
  }

  /**
   * Calculate effect size from hazard ratio data
   * @param {Object} study - { hr, ci_lower, ci_upper } or { hr, se }
   */
  function calcHREffect(study) {
    if (study.se) {
      return { TE: Math.log(study.hr), seTE: study.se, measure: 'HR' };
    }
    // From confidence interval
    const lo = Math.log(study.ci_lower);
    const hi = Math.log(study.ci_upper);
    const seTE = (hi - lo) / (2 * 1.96);
    return { TE: Math.log(study.hr), seTE, measure: 'HR' };
  }

  // ============================================================
  // 3. Meta-Analysis Pooling Methods
  // ============================================================

  /**
   * Fixed-effect meta-analysis (inverse variance method)
   * @param {Array} studies - [{ TE, seTE }, ...]
   * @returns {Object} { TE, seTE, lower, upper, z, p, weight, I2, Q, tau2, ... }
   */
  function fixedEffect(studies) {
    const validStudies = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (validStudies.length === 0) return null;

    let sumW = 0, sumWT = 0;
    const weights = [];

    for (const s of validStudies) {
      const w = 1 / (s.seTE * s.seTE);
      weights.push(w);
      sumW += w;
      sumWT += w * s.TE;
    }

    const TE = sumWT / sumW;
    const seTE = Math.sqrt(1 / sumW);
    const z = TE / seTE;
    const p = 2 * (1 - normalCDF(Math.abs(z)));
    const lower = TE - 1.96 * seTE;
    const upper = TE + 1.96 * seTE;

    // Weights as percentages
    const weightsPct = weights.map(w => (w / sumW) * 100);

    // Heterogeneity
    const het = calcHeterogeneity(validStudies, TE, 'DL');

    return {
      model: 'fixed',
      TE, seTE, lower, upper, z, p,
      weights, weightsPct,
      k: validStudies.length,
      ...het
    };
  }

  /**
   * Random-effects meta-analysis (DerSimonian-Laird)
   * @param {Array} studies - [{ TE, seTE }, ...]
   * @param {string} tau2Method - 'DL', 'HE', 'SJ', 'REML'
   * @returns {Object}
   */
  function randomEffect(studies, tau2Method = 'DL') {
    const validStudies = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (validStudies.length === 0) return null;

    const k = validStudies.length;
    if (k === 1) {
      // Only one study, same as fixed
      return fixedEffect(validStudies);
    }

    // First, compute fixed-effect estimate for Q calculation
    let sumW = 0, sumWT = 0;
    for (const s of validStudies) {
      const w = 1 / (s.seTE * s.seTE);
      sumW += w;
      sumWT += w * s.TE;
    }
    const TE_fixed = sumWT / sumW;

    // Calculate tau2
    const tau2 = calcTau2(validStudies, TE_fixed, tau2Method);

    // Random-effects weights
    const weights = [];
    let sumWr = 0, sumWrT = 0;
    for (const s of validStudies) {
      const w = 1 / (s.seTE * s.seTE + tau2);
      weights.push(w);
      sumWr += w;
      sumWrT += w * s.TE;
    }

    const TE = sumWrT / sumWr;
    const seTE = Math.sqrt(1 / sumWr);
    const z = TE / seTE;
    const p = 2 * (1 - normalCDF(Math.abs(z)));
    const lower = TE - 1.96 * seTE;
    const upper = TE + 1.96 * seTE;

    const weightsPct = weights.map(w => (w / sumWr) * 100);

    // Heterogeneity
    const het = calcHeterogeneity(validStudies, TE_fixed, tau2Method);
    het.tau2 = tau2;
    het.tau = Math.sqrt(Math.max(0, tau2));

    // I2 with CI
    het.I2_lower = 0;
    het.I2_upper = 100;
    if (het.Q > het.df && het.df > 0) {
      const lowerQ = Math.max(0, het.Q - 1.96 * Math.sqrt(2 * het.df));
      const upperQ = het.Q + 1.96 * Math.sqrt(2 * het.df);
      het.I2_lower = Math.max(0, 100 * (lowerQ - het.df) / lowerQ);
      het.I2_upper = Math.max(0, 100 * (upperQ - het.df) / upperQ);
    }

    return {
      model: 'random',
      TE, seTE, lower, upper, z, p,
      weights, weightsPct,
      k,
      ...het
    };
  }

  /**
   * Calculate tau2 using different methods
   */
  function calcTau2(studies, TE_fixed, method) {
    const k = studies.length;
    const df = k - 1;

    let Q = 0, sumW = 0;
    for (const s of studies) {
      const w = 1 / (s.seTE * s.seTE);
      Q += w * (s.TE - TE_fixed) * (s.TE - TE_fixed);
      sumW += w;
    }

    switch (method) {
      case 'DL': // DerSimonian-Laird
        const C = sumW - sumW * sumW / (sumW); // This simplifies
        let sumW2 = 0;
        for (const s of studies) {
          const w = 1 / (s.seTE * s.seTE);
          sumW2 += w * w;
        }
        const c = sumW - sumW2 / sumW;
        return Math.max(0, (Q - df) / c);

      case 'HE': // Hedges
        let numerator = 0, denominator = 0;
        for (const s of studies) {
          const w = 1 / (s.seTE * s.seTE);
          numerator += w * (s.TE - TE_fixed) * (s.TE - TE_fixed);
          denominator += w;
        }
        return Math.max(0, (numerator / denominator) - df / denominator);

      case 'SJ': // Sidik-Jonkman
        let sumR = 0, sumR2 = 0;
        const r_vals = studies.map(s => s.TE - TE_fixed);
        const r2_vals = r_vals.map(r => r * r);
        let sum1_over_v = 0;
        for (let i = 0; i < k; i++) {
          const v = studies[i].seTE * studies[i].seTE;
          sumR += r2_vals[i] / v;
          sum1_over_v += 1 / v;
        }
        const tau2_SJ = sumR / k;
        // Iterate
        let tau2_est = tau2_SJ;
        for (let iter = 0; iter < 10; iter++) {
          let sumW_new = 0, sumWT_new = 0, sumW2_new = 0;
          for (let i = 0; i < k; i++) {
            const w = 1 / (studies[i].seTE * studies[i].seTE + tau2_est);
            sumW_new += w;
            sumWT_new += w * studies[i].TE;
            sumW2_new += w * w;
          }
          const TE_new = sumWT_new / sumW_new;
          let Q_new = 0;
          for (let i = 0; i < k; i++) {
            const w = 1 / (studies[i].seTE * studies[i].seTE + tau2_est);
            Q_new += w * (studies[i].TE - TE_new) * (studies[i].TE - TE_new);
          }
          const c_new = sumW_new - sumW2_new / sumW_new;
          tau2_est = Math.max(0, (Q_new - (k - 1)) / c_new);
          if (tau2_est < 1e-12) tau2_est = 0;
        }
        return tau2_est;

      case 'REML': // Restricted Maximum Likelihood
        let tau2_reml = 0;
        for (let iter = 0; iter < 100; iter++) {
          let sumW_r = 0, sumWT_r = 0, sumW2_r = 0;
          for (let i = 0; i < k; i++) {
            const w = 1 / (studies[i].seTE * studies[i].seTE + tau2_reml);
            sumW_r += w;
            sumWT_r += w * studies[i].TE;
            sumW2_r += w * w;
          }
          const TE_r = sumWT_r / sumW_r;
          let Q_r = 0, trace = 0;
          for (let i = 0; i < k; i++) {
            const w = 1 / (studies[i].seTE * studies[i].seTE + tau2_reml);
            Q_r += w * (studies[i].TE - TE_r) * (studies[i].TE - TE_r);
            trace += w * w;
          }
          const tau2_new = Math.max(0, (Q_r - (k - 1) + trace / sumW_r - sumW2_r / (sumW_r * sumW_r)) /
            (sumW_r - sumW2_r / sumW_r));
          if (Math.abs(tau2_new - tau2_reml) < 1e-10) {
            tau2_reml = tau2_new;
            break;
          }
          tau2_reml = tau2_new;
        }
        return tau2_reml;

      default:
        return calcTau2(studies, TE_fixed, 'DL');
    }
  }

  /**
   * Calculate heterogeneity statistics
   */
  function calcHeterogeneity(studies, TE_fixed, tau2Method) {
    const k = studies.length;
    const df = k - 1;

    let Q = 0, sumW = 0;
    for (const s of studies) {
      const w = 1 / (s.seTE * s.seTE);
      Q += w * (s.TE - TE_fixed) * (s.TE - TE_fixed);
      sumW += w;
    }

    const Q_p = chiSquareSF(Q, df);
    const I2 = Math.max(0, 100 * (Q - df) / Q);
    const H = Math.sqrt(Math.max(1, Q / df));

    return {
      Q, df, Q_p,
      I2: I2,
      H: H,
      tau2Method: tau2Method
    };
  }

  // ============================================================
  // 4. Subgroup Analysis
  // ============================================================

  /**
   * Perform subgroup analysis
   * @param {Array} studies - all studies with subgroup info
   * @param {string} subgroupKey - key for subgroup property
   * @param {string} model - 'fixed' or 'random'
   * @param {string} measure - effect measure
   */
  function subgroupAnalysis(studies, subgroupKey, model, tau2Method) {
    const groups = {};
    for (const s of studies) {
      const g = s[subgroupKey] || 'Unknown';
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    }

    const results = [];
    for (const [groupName, groupStudies] of Object.entries(groups)) {
      const result = model === 'random'
        ? randomEffect(groupStudies, tau2Method)
        : fixedEffect(groupStudies);
      if (result) {
        results.push({
          name: groupName,
          k: groupStudies.length,
          ...result
        });
      }
    }

    // Test for subgroup differences (between-group Q)
    let Q_between = 0;
    let totalTE = 0;
    let totalW = 0;
    for (const r of results) {
      const w = 1 / (r.seTE * r.seTE);
      Q_between += w * r.TE * r.TE;
      totalTE += w * r.TE;
      totalW += w;
    }
    const TE_overall = totalTE / totalW;
    Q_between = 0;
    for (const r of results) {
      const w = 1 / (r.seTE * r.seTE);
      Q_between += w * (r.TE - TE_overall) * (r.TE - TE_overall);
    }
    const df_between = results.length - 1;
    const Q_between_p = chiSquareSF(Q_between, df_between);

    // Within-group heterogeneity
    let Q_within = 0;
    for (const r of results) {
      Q_within += r.Q;
    }
    const df_within = studies.length - results.length;
    const Q_within_p = chiSquareSF(Q_within, df_within);

    return {
      groups: results,
      Q_between, df_between, Q_between_p,
      Q_within, df_within, Q_within_p,
      I2_between: Math.max(0, 100 * (Q_between - df_between) / Math.max(Q_between, 0.001))
    };
  }

  // ============================================================
  // 5. Meta-Regression
  // ============================================================

  /**
   * Simple (univariable) meta-regression
   * @param {Array} studies - studies with TE, seTE, and a moderator variable
   * @param {string} moderatorKey - key for the moderator variable
   * @param {string} tau2Method - method for tau2
   */
  function metaRegression(studies, moderatorKey, tau2Method = 'REML') {
    const valid = studies.filter(s =>
      isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0 &&
      s[moderatorKey] !== undefined && s[moderatorKey] !== null && !isNaN(parseFloat(s[moderatorKey]))
    );

    if (valid.length < 3) return null;

    const k = valid.length;
    const x = valid.map(s => parseFloat(s[moderatorKey]));
    const y = valid.map(s => s.TE);
    const v = valid.map(s => s.seTE * s.seTE);

    // WLS regression with iterative tau2 estimation
    let tau2 = 0;
    let beta0, beta1, seBeta0, seBeta1, R2;

    for (let iter = 0; iter < 50; iter++) {
      const w = v.map(vi => 1 / (vi + tau2));
      const sumW = w.reduce((a, b) => a + b, 0);
      const sumWX = w.reduce((a, b, i) => a + b * x[i], 0);
      const sumWY = w.reduce((a, b, i) => a + b * y[i], 0);
      const sumWXX = w.reduce((a, b, i) => a + b * x[i] * x[i], 0);
      const sumWXY = w.reduce((a, b, i) => a + b * x[i] * y[i], 0);

      const denom = sumW * sumWXX - sumWX * sumWX;
      if (Math.abs(denom) < 1e-30) return null;

      beta1 = (sumW * sumWXY - sumWX * sumWY) / denom;
      beta0 = (sumWY - beta1 * sumWX) / sumW;

      // Residuals and Q
      const residuals = y.map((yi, i) => yi - (beta0 + beta1 * x[i]));
      const Q = residuals.reduce((acc, r, i) => acc + w[i] * r * r, 0);
      const df = k - 2;

      // Update tau2 (REML)
      let trace = 0, sumW2 = 0;
      for (let i = 0; i < k; i++) {
        const wi = 1 / (v[i] + tau2);
        const xi_centered = x[i] - x.reduce((a, b, j) => a + w[j] * b[j], 0) / sumW;
        trace += wi * wi * (1 + xi_centered * xi_centered * w.reduce((a, b, j) => a + b, 0) /
          (sumW * sumWXX - sumWX * sumWX));
        sumW2 += wi * wi;
      }
      const tau2_new = Math.max(0, (Q - df + trace) / (sumW - sumW2 / sumW));

      if (Math.abs(tau2_new - tau2) < 1e-10) {
        tau2 = tau2_new;
        break;
      }
      tau2 = tau2_new;
    }

    // Final standard errors
    const w = v.map(vi => 1 / (vi + tau2));
    const sumW = w.reduce((a, b) => a + b, 0);
    const sumWX = w.reduce((a, b, i) => a + b * x[i], 0);
    const sumWXX = w.reduce((a, b, i) => a + b * x[i] * x[i], 0);
    const denom = sumW * sumWXX - sumWX * sumWX;

    seBeta1 = Math.sqrt(sumW / denom);
    seBeta0 = Math.sqrt(sumWXX / denom);

    const z_beta1 = beta1 / seBeta1;
    const p_beta1 = 2 * (1 - normalCDF(Math.abs(z_beta1)));
    const z_beta0 = beta0 / seBeta0;
    const p_beta0 = 2 * (1 - normalCDF(Math.abs(z_beta0)));

    // R-squared (proportion of heterogeneity explained)
    const tau2_total = calcTau2(valid, fixedEffect(valid).TE, tau2Method);
    R2 = tau2_total > 0 ? Math.max(0, Math.min(1, 1 - tau2 / tau2_total)) * 100 : 0;

    // Omnibus test (Q for the model)
    const residuals = y.map((yi, i) => yi - (beta0 + beta1 * x[i]));
    const Q_model = residuals.reduce((acc, r, i) => acc + w[i] * r * r, 0);
    const Q_model_p = chiSquareSF(Q_model, k - 2);

    // Test for moderator
    const Q_moderator = (beta1 * beta1) / (seBeta1 * seBeta1);
    const Q_moderator_p = chiSquareSF(Q_moderator, 1);

    return {
      beta0, seBeta0, z_beta0, p_beta0,
      beta1, seBeta1, z_beta1, p_beta1,
      tau2, tau: Math.sqrt(Math.max(0, tau2)),
      R2,
      Q_model, Q_model_p,
      Q_moderator, Q_moderator_p,
      k, df: k - 2,
      x: x, y: y,
      fitted: x.map(xi => beta0 + beta1 * xi)
    };
  }

  // ============================================================
  // 6. Publication Bias Tests
  // ============================================================

  /**
   * Egger's regression test for publication bias
   */
  function eggerTest(studies) {
    const valid = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (valid.length < 3) return null;

    const k = valid.length;
    const x = valid.map(s => 1 / s.seTE); // precision (1/SE)
    const y = valid.map(s => s.TE / s.seTE); // standardized effect (Z)

    // OLS regression
    const meanX = x.reduce((a, b) => a + b, 0) / k;
    const meanY = y.reduce((a, b) => a + b, 0) / k;
    let Sxx = 0, Sxy = 0;
    for (let i = 0; i < k; i++) {
      Sxx += (x[i] - meanX) * (x[i] - meanX);
      Sxy += (x[i] - meanX) * (y[i] - meanY);
    }
    const slope = Sxy / Sxx;
    const intercept = meanY - slope * meanX;

    // Residuals and standard errors
    const residuals = y.map((yi, i) => yi - (intercept + slope * x[i]));
    const RSS = residuals.reduce((acc, r) => acc + r * r, 0);
    const sigma2 = RSS / (k - 2);
    const se_intercept = Math.sqrt(sigma2 * (1 / k + meanX * meanX / Sxx));
    const se_slope = Math.sqrt(sigma2 / Sxx);

    const t_intercept = intercept / se_intercept;
    const p_intercept = tTwoTailed(t_intercept, k - 2);
    const t_slope = slope / se_slope;
    const p_slope = tTwoTailed(t_slope, k - 2);

    return {
      intercept, se_intercept, t_intercept, p_intercept,
      slope, se_slope, t_slope, p_slope,
      df: k - 2,
      x: x, y: y,
      fitted: x.map(xi => intercept + slope * xi)
    };
  }

  /**
   * Begg's rank correlation test
   */
  function beggTest(studies) {
    const valid = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (valid.length < 4) return null;

    const k = valid.length;
    // Standardized effect sizes (remove study, compute pooled estimate without it)
    const TE_all = valid.reduce((sum, s) => sum + s.TE / s.seTE / s.seTE, 0) /
      valid.reduce((sum, s) => sum + 1 / (s.seTE * s.seTE), 0);

    // Compute standardized residuals
    const T_star = valid.map(s => (s.TE - TE_all) / Math.sqrt(s.seTE * s.seTE));
    // Variance of each T*
    const varT = T_star.map((t, i) => {
      const v = valid[i].seTE * valid[i].seTE;
      return 1 - v / valid.reduce((sum, s) => sum + 1 / (s.seTE * s.seTE), 0);
    });
    // Standardized
    const Z = T_star.map((t, i) => t / Math.sqrt(Math.max(0.001, varT[i])));
    // Var of Z = 1/SE
    const varZ = valid.map(s => 1 / (s.seTE * s.seTE));

    // Kendall's tau between Z and varZ
    let concordant = 0, discordant = 0, ties = 0;
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const dz = Z[i] - Z[j];
        const dv = varZ[i] - varZ[j];
        if (dz * dv > 0) concordant++;
        else if (dz * dv < 0) discordant++;
        else ties++;
      }
    }
    const tau = (concordant - discordant) / (0.5 * k * (k - 1));

    // Variance of tau under null (no ties)
    const varTau = (2 * (2 * k + 5)) / (9 * k * (k - 1));
    const z = tau / Math.sqrt(varTau);
    const p = 2 * (1 - normalCDF(Math.abs(z)));

    return { tau, z, p, k };
  }

  /**
   * Trim and Fill method (Duval & Tweedie)
   * @param {Array} studies
   * @param {string} side - 'right' or 'left'
   */
  function trimAndFill(studies) {
    const valid = studies.filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    if (valid.length < 3) return null;

    const k = valid.length;

    // Determine side (direction of funnel plot asymmetry)
    // Use Egger's test intercept sign or just try both
    let sorted = [...valid].sort((a, b) => a.TE - b.TE);
    const medianTE = sorted[Math.floor(k / 2)].TE;
    const meanTE = valid.reduce((sum, s) => sum + s.TE, 0) / k;

    // Try trimming from the right side (studies with large positive TE)
    let side = meanTE > 0 ? 'right' : 'left';

    // Iterative trimming
    let trimCount = 0;
    let adjustedStudies = [...valid];

    const fillStudies = (side) => {
      let currentStudies = [...valid];
      let maxIter = k;
      let prevGamma = -1;

      for (let iter = 0; iter < maxIter; iter++) {
        const n = currentStudies.length;
        // Sort by TE
        const s = [...currentStudies].sort((a, b) =>
          side === 'right' ? a.TE - b.TE : b.TE - a.TE
        );

        // Compute the rightmost (or leftmost) estimates
        // Gamma_k = sum of ranks for trimmed studies
        let gamma = 0;
        for (let j = 0; j <= n - 1; j++) {
          // Trim the most extreme j+1 studies
          const trimmed = s.slice(0, j + 1);
          const remaining = s.slice(j + 1);
          if (remaining.length === 0) break;

          const TE0 = remaining.reduce((sum, st) => sum + st.TE, 0) / remaining.length;

          // Compute Tn
          let Tn = 0;
          for (let i = 0; i < remaining.length; i++) {
            for (let j2 = i + 1; j2 < remaining.length; j2++) {
              Tn += Math.abs(remaining[i].TE - remaining[j2].TE);
            }
          }
          Tn /= (remaining.length * (remaining.length - 1) / 2) || 1;

          let gamma_j = 0;
          for (const t of trimmed) {
            if (side === 'right') {
              gamma_j += Math.max(0, t.TE - TE0);
            } else {
              gamma_j += Math.max(0, TE0 - t.TE);
            }
          }

          // Check if this is the optimal trim
          if (gamma_j === 0 && j > 0) {
            trimCount = j;
            break;
          }
          if (gamma_j === 0) {
            trimCount = 0;
            break;
          }
        }

        // Estimate number to trim
        // Use simpler estimator: L0
        const allSorted = [...currentStudies].sort((a, b) =>
          side === 'right' ? a.TE - b.TE : b.TE - a.TE
        );
        const TE0_all = currentStudies.reduce((sum, st) => sum + st.TE, 0) / currentStudies.length;

        let L0 = 0;
        for (let i = 0; i < allSorted.length; i++) {
          if (side === 'right') {
            if (allSorted[i].TE <= TE0_all) break;
            L0++;
          } else {
            if (allSorted[i].TE >= TE0_all) break;
            L0++;
          }
        }

        trimCount = L0;

        // Fill: add trimmed studies mirrored
        const toFill = allSorted.slice(0, trimCount);
        const filled = toFill.map(st => ({
          ...st,
          TE: 2 * TE0_all - st.TE,
          seTE: st.seTE,
          isFill: true
        }));

        currentStudies = [...currentStudies, ...filled];
        break;
      }

      return currentStudies;
    };

    adjustedStudies = fillStudies(side);

    // If no fill needed, try other side
    if (adjustedStudies.length === valid.length) {
      const otherSide = side === 'right' ? 'left' : 'right';
      const altResult = fillStudies(otherSide);
      if (altResult.length > valid.length) {
        adjustedStudies = altResult;
        side = otherSide;
      }
    }

    // Compute adjusted estimate
    const originalResult = fixedEffect(valid);
    const adjustedResult = fixedEffect(adjustedStudies);

    return {
      originalTE: originalResult.TE,
      originalCI: [originalResult.lower, originalResult.upper],
      adjustedTE: adjustedResult.TE,
      adjustedCI: [adjustedResult.lower, adjustedResult.upper],
      trimCount: adjustedStudies.length - valid.length,
      side: side,
      filledStudies: adjustedStudies.filter(s => s.isFill),
      allStudies: adjustedStudies
    };
  }

  // ============================================================
  // 7. Sensitivity Analysis
  // ============================================================

  /**
   * Leave-one-out sensitivity analysis
   */
  function leaveOneOut(studies, model, tau2Method) {
    const results = [];
    for (let i = 0; i < studies.length; i++) {
      const remaining = studies.filter((_, idx) => idx !== i);
      const result = model === 'random'
        ? randomEffect(remaining, tau2Method)
        : fixedEffect(remaining);
      if (result) {
        results.push({
          excluded: studies[i],
          index: i,
          TE: result.TE,
          seTE: result.seTE,
          lower: result.lower,
          upper: result.upper,
          p: result.p,
          I2: result.I2,
          tau2: result.tau2
        });
      }
    }
    return results;
  }

  /**
   * Cumulative meta-analysis
   * @param {Array} studies - sorted by year or specified order
   * @param {string} model
   * @param {string} sortKey - key to sort by (e.g., 'year')
   */
  function cumulativeMeta(studies, model, tau2Method, sortKey) {
    const sorted = [...studies].sort((a, b) => {
      if (sortKey) {
        const va = parseFloat(a[sortKey]) || 0;
        const vb = parseFloat(b[sortKey]) || 0;
        return va - vb;
      }
      return 0;
    });

    const results = [];
    for (let i = 1; i <= sorted.length; i++) {
      const subset = sorted.slice(0, i);
      const result = model === 'random'
        ? randomEffect(subset, tau2Method)
        : fixedEffect(subset);
      if (result) {
        results.push({
          k: i,
          lastStudy: subset[subset.length - 1],
          TE: result.TE,
          seTE: result.seTE,
          lower: result.lower,
          upper: result.upper,
          p: result.p
        });
      }
    }
    return results;
  }

  // ============================================================
  // 8. Diagnostic Test Meta-Analysis
  // ============================================================

  /**
   * Calculate diagnostic test measures from 2x2 table
   * @param {Object} study - { TP, FP, FN, TN }
   * @returns {Object} - sensitivity, specificity, plr, nlr, dor, logDOR, seLogDOR, etc.
   */
  function calcDiagnosticEffect(study) {
    let TP = study.TP, FP = study.FP, FN = study.FN, TN = study.TN;

    // Continuity correction for zero cells
    const hasZero = (TP === 0 || FP === 0 || FN === 0 || TN === 0);
    const cc = 0.5;
    if (hasZero) {
      TP = TP + cc; FP = FP + cc; FN = FN + cc; TN = TN + cc;
    }

    const n1 = TP + FN; // diseased
    const n2 = FP + TN; // non-diseased

    // Sensitivity (TPR)
    const sensitivity = TP / n1;
    const seSens = Math.sqrt(sensitivity * (1 - sensitivity) / n1);

    // Specificity (TNR)
    const specificity = TN / n2;
    const seSpec = Math.sqrt(specificity * (1 - specificity) / n2);

    // FPR = 1 - Sp
    const fpr = FP / n2;

    // PLR = Se / (1 - Sp)
    const plr = sensitivity / (1 - specificity);
    const seLogPLR = Math.sqrt(1 / TP - 1 / n1 + 1 / FP - 1 / n2);

    // NLR = (1 - Se) / Sp
    const nlr = (1 - sensitivity) / specificity;
    const seLogNLR = Math.sqrt(1 / FN - 1 / n1 + 1 / TN - 1 / n2);

    // DOR = (TP*TN)/(FP*FN)
    const dor = (TP * TN) / (FP * FN);
    const logDOR = Math.log(dor);
    const seLogDOR = Math.sqrt(1 / TP + 1 / FP + 1 / FN + 1 / TN);

    // Logit transforms for SROC
    const logitSe = Math.log(TP / FN);     // logit(sensitivity)
    const seLogitSe = Math.sqrt(1 / TP + 1 / FN);
    const logitSp = Math.log(TN / FP);     // logit(specificity)
    const seLogitSp = Math.sqrt(1 / TN + 1 / FP);
    const logitFPR = Math.log(FP / TN);    // = -logit(Sp)

    // D and S for Moses-Littenberg
    const D = logitSe - logitFPR;          // = log DOR
    const S = logitSe + logitFPR;          // = logitSe - logitSp

    // 95% CIs
    const zCrit = 1.96;
    const dorCI = [Math.exp(logDOR - zCrit * seLogDOR), Math.exp(logDOR + zCrit * seLogDOR)];
    const seCI = [sensitivity - zCrit * seSens, sensitivity + zCrit * seSens];
    const spCI = [specificity - zCrit * seSpec, specificity + zCrit * seSpec];
    const plrCI = [Math.exp(Math.log(plr) - zCrit * seLogPLR), Math.exp(Math.log(plr) + zCrit * seLogPLR)];
    const nlrCI = [Math.exp(Math.log(nlr) - zCrit * seLogNLR), Math.exp(Math.log(nlr) + zCrit * seLogNLR)];

    return {
      TE: logDOR, seTE: seLogDOR,
      measure: 'DOR',
      sensitivity, seSens, specificity, seSpec,
      fpr, dor, logDOR, seLogDOR,
      plr, seLogPLR, nlr, seLogNLR,
      logitSe, seLogitSe, logitSp, seLogitSp, logitFPR,
      D, S,
      dorCI, seCI, spCI, plrCI, nlrCI,
      hasContinuityCorrection: hasZero,
      n1, n2
    };
  }

  /**
   * Pool a single diagnostic measure on logit/log scale
   * @param {Array} studies - studies with calculated diagnostic measures
   * @param {string} teKey - key for the log-scale effect (e.g. 'logDOR', 'logitSe')
   * @param {string} seKey - key for the SE
   * @param {string} model - 'fixed' or 'random'
   * @param {string} tau2Method
   * @returns {Object} pooled result with back-transformed estimate
   */
  function poolDiagnosticMeasure(studies, teKey, seKey, model, tau2Method) {
    const transformed = studies.map(s => ({
      TE: s[teKey],
      seTE: s[seKey],
      label: s.label || s.name || 'Study'
    })).filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);

    if (transformed.length === 0) return null;

    const result = model === 'random'
      ? randomEffect(transformed, tau2Method)
      : fixedEffect(transformed);

    if (!result) return null;

    return result;
  }

  /**
   * Moses-Littenberg SROC analysis
   * Weighted regression of D (log DOR) on S (logitSe + logitFPR)
   * @param {Array} studies - studies with D, S, seLogDOR
   * @returns {Object} { a, b, seA, seB, srocCurve, auc, qStar, qStarPoint }
   */
  function srocAnalysis(studies) {
    const valid = studies.filter(s =>
      isFinite(s.D) && isFinite(s.S) && isFinite(s.seLogDOR) && s.seLogDOR > 0
    );

    if (valid.length < 2) return null;

    const k = valid.length;
    const D = valid.map(s => s.D);      // log DOR
    const S = valid.map(s => s.S);      // logit(Se) + logit(FPR)
    const w = valid.map(s => 1 / (s.seLogDOR * s.seLogDOR));

    // Weighted regression: D = a + b * S
    const sumW = w.reduce((a, b) => a + b, 0);
    const sumWS = w.reduce((acc, wi, i) => acc + wi * S[i], 0);
    const sumWD = w.reduce((acc, wi, i) => acc + wi * D[i], 0);
    const sumWSS = w.reduce((acc, wi, i) => acc + wi * S[i] * S[i], 0);
    const sumWSD = w.reduce((acc, wi, i) => acc + wi * S[i] * D[i], 0);

    const denom = sumW * sumWSS - sumWS * sumWS;
    if (Math.abs(denom) < 1e-30) return null;

    const b = (sumW * sumWSD - sumWS * sumWD) / denom;
    const a = (sumWD - b * sumWS) / sumW;

    // Standard errors
    const residuals = D.map((d, i) => d - (a + b * S[i]));
    const RSS = residuals.reduce((acc, r, i) => acc + w[i] * r * r, 0);
    const sigma2 = RSS / Math.max(1, k - 2);

    const seB = Math.sqrt(Math.max(0, sigma2 * sumW / denom));
    const seA = Math.sqrt(Math.max(0, sigma2 * sumWSS / denom));

    const tB = seB > 0 ? b / seB : 0;
    const pB = tTwoTailed(tB, k - 2);
    const tA = seA > 0 ? a / seA : 0;
    const pA = tTwoTailed(tA, k - 2);

    // Generate SROC curve: for each FPR value, compute predicted TPR
    // logit(TPR) = [a + (1+b)*logit(FPR)] / (1-b)
    const srocCurve = [];
    const nPoints = 200;
    for (let i = 0; i <= nPoints; i++) {
      const fpr = (i / nPoints) * 0.99 + 0.005; // avoid 0 and 1
      const logitFPR = Math.log(fpr / (1 - fpr));
      let logitTPR;
      if (Math.abs(1 - b) < 1e-10) {
        // Near-symmetric: use simplified form
        logitTPR = a / 2 + logitFPR;
      } else {
        logitTPR = (a + (1 + b) * logitFPR) / (1 - b);
      }
      const tpr = 1 / (1 + Math.exp(-logitTPR));
      srocCurve.push({ fpr, tpr });
    }

    // AUC (Area Under SROC Curve) via trapezoidal rule
    let auc = 0;
    for (let i = 1; i < srocCurve.length; i++) {
      const dx = srocCurve[i].fpr - srocCurve[i - 1].fpr;
      const yAvg = (srocCurve[i].tpr + srocCurve[i - 1].tpr) / 2;
      auc += dx * yAvg;
    }

    // Q* index: the point where Se = Sp (i.e., TPR = 1 - FPR)
    // At Q*: logit(TPR) = -logit(FPR), which gives logit(FPR) = -a/2, logit(TPR) = a/2
    const qStarLogitTPR = a / 2;
    const qStarTPR = 1 / (1 + Math.exp(-qStarLogitTPR));
    const qStarFPR = 1 - qStarTPR;
    const qStar = qStarTPR; // Se = Sp at Q*

    // SE of Q* (approximate using delta method on a)
    const seQStar = seA > 0
      ? Math.abs(qStarTPR * (1 - qStarTPR) * seA / 2)
      : 0;

    return {
      a, b, seA, seB, tA, pA, tB, pB,
      srocCurve, auc,
      qStar, seQStar,
      qStarPoint: { fpr: qStarFPR, tpr: qStarTPR },
      k
    };
  }

  /**
   * Full diagnostic meta-analysis
   * Pools logDOR, logit(Se), logit(Sp), log(PLR), log(NLR)
   * Performs Moses-Littenberg SROC analysis
   * @param {Array} studies - studies with diagnostic effect sizes calculated
   * @param {string} model - 'fixed' or 'random'
   * @param {string} tau2Method
   * @returns {Object} comprehensive diagnostic results
   */
  function diagnosticMeta(studies, model, tau2Method) {
    const valid = studies.filter(s =>
      isFinite(s.logDOR) && isFinite(s.seLogDOR) && s.seLogDOR > 0
    );

    if (valid.length === 0) return null;

    // Pool log DOR
    const dorResult = poolDiagnosticMeasure(valid, 'logDOR', 'seLogDOR', model, tau2Method);

    // Pool logit(Sensitivity)
    const seResult = poolDiagnosticMeasure(valid, 'logitSe', 'seLogitSe', model, tau2Method);

    // Pool logit(Specificity)
    const spResult = poolDiagnosticMeasure(valid, 'logitSp', 'seLogitSp', model, tau2Method);

    // Pool log(PLR)
    const plrStudies = valid.map(s => ({
      TE: Math.log(s.plr), seTE: s.seLogPLR, label: s.label || s.name || 'Study'
    })).filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    const plrResult = model === 'random'
      ? randomEffect(plrStudies, tau2Method)
      : fixedEffect(plrStudies);

    // Pool log(NLR)
    const nlrStudies = valid.map(s => ({
      TE: Math.log(s.nlr), seTE: s.seLogNLR, label: s.label || s.name || 'Study'
    })).filter(s => isFinite(s.TE) && isFinite(s.seTE) && s.seTE > 0);
    const nlrResult = model === 'random'
      ? randomEffect(nlrStudies, tau2Method)
      : fixedEffect(nlrStudies);

    // SROC analysis
    const sroc = srocAnalysis(valid);

    // Back-transform pooled estimates with CIs
    const pooledSe = seResult ? 1 / (1 + Math.exp(-seResult.TE)) : null;
    const seCI = seResult ? {
      lower: 1 / (1 + Math.exp(-seResult.lower)),
      upper: 1 / (1 + Math.exp(-seResult.upper))
    } : null;

    const pooledSp = spResult ? 1 / (1 + Math.exp(-spResult.TE)) : null;
    const spCI = spResult ? {
      lower: 1 / (1 + Math.exp(-spResult.lower)),
      upper: 1 / (1 + Math.exp(-spResult.upper))
    } : null;

    const pooledDOR = dorResult ? Math.exp(dorResult.TE) : null;
    const dorCI = dorResult ? {
      lower: Math.exp(dorResult.lower),
      upper: Math.exp(dorResult.upper)
    } : null;

    const pooledPLR = plrResult ? Math.exp(plrResult.TE) : null;
    const plrCI = plrResult ? {
      lower: Math.exp(plrResult.lower),
      upper: Math.exp(plrResult.upper)
    } : null;

    const pooledNLR = nlrResult ? Math.exp(nlrResult.TE) : null;
    const nlrCI = nlrResult ? {
      lower: Math.exp(nlrResult.lower),
      upper: Math.exp(nlrResult.upper)
    } : null;

    return {
      dorResult, seResult, spResult, plrResult, nlrResult,
      sroc,
      pooledSe, seCI, pooledSp, spCI,
      pooledDOR, dorCI,
      pooledPLR, plrCI, pooledNLR, nlrCI,
      model, k: valid.length,
      studies: valid
    };
  }

  // ============================================================
  // 9. Utility Functions
  // ============================================================

  // Format p-value
  function formatP(p) {
    if (p < 0.001) return '< 0.001';
    if (p < 0.01) return p.toFixed(3);
    if (p < 0.05) return p.toFixed(3);
    return p.toFixed(3);
  }

  // Format number
  function formatNum(x, decimals = 2) {
    if (!isFinite(x)) return '-';
    if (Math.abs(x) < 0.001 && x !== 0) return x.toExponential(2);
    return x.toFixed(decimals);
  }

  // Convert log effect size back to original scale
  function expTransform(TE, seTE, lower, upper, measure) {
    if (measure === 'OR' || measure === 'RR' || measure === 'HR' || measure === 'DOR') {
      return {
        estimate: Math.exp(TE),
        se: seTE,
        lower: Math.exp(lower),
        upper: Math.exp(upper)
      };
    }
    if (measure === 'CORR') {
      return {
        estimate: (Math.exp(2 * TE) - 1) / (Math.exp(2 * TE) + 1),
        se: seTE,
        lower: (Math.exp(2 * lower) - 1) / (Math.exp(2 * lower) + 1),
        upper: (Math.exp(2 * upper) - 1) / (Math.exp(2 * upper) + 1)
      };
    }
    if (measure === 'PROP') {
      return {
        estimate: Math.exp(TE) / (1 + Math.exp(TE)),
        se: seTE,
        lower: Math.exp(lower) / (1 + Math.exp(lower)),
        upper: Math.exp(upper) / (1 + Math.exp(upper))
      };
    }
    return { estimate: TE, se: seTE, lower, upper };
  }

  // Compute confidence interval
  function computeCI(TE, seTE, level = 0.95) {
    const z = inverseNormalCDF(1 - (1 - level) / 2);
    return {
      lower: TE - z * seTE,
      upper: TE + z * seTE
    };
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // Distributions
    normalPDF, normalCDF, inverseNormalCDF,
    chiSquareCDF, chiSquareSF, inverseChiSquareCDF,
    tCDF, tTwoTailed, inverseTCDF,
    fCDF, fSF,
    // Effect sizes
    calcBinaryEffect, calcContinuousEffect, calcCorrEffect,
    calcProportionEffect, calcHREffect,
    // Pooling
    fixedEffect, randomEffect, calcTau2,
    // Heterogeneity
    calcHeterogeneity,
    // Advanced
    subgroupAnalysis, metaRegression,
    leaveOneOut, cumulativeMeta,
    // Publication bias
    eggerTest, beggTest, trimAndFill,
    // Diagnostic test
    calcDiagnosticEffect, diagnosticMeta, srocAnalysis,
    poolDiagnosticMeasure,
    // Utilities
    formatP, formatNum, expTransform, computeCI
  };
})();
