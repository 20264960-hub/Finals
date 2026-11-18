// One shared object stores the current inputs and calculated results.
var appState = {
  principal: 5000,
  annualRate: 4.5,
  months: 3,
  regularAddition: 0,
  additionFrequency: "monthly",
  compoundingFrequency: "monthly",
  finalAmount: 5056.57,
  totalEarned: 56.57,
  monthlyGrowth: 37.5,
  dailyEarnings: 0.62,
  points: []
};

// Month names are used for chart tooltips and monthly table rows.
var monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
// Convert each contribution schedule into its number of payments per year.
var paymentsPerYear = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1
};
// Convert each compounding choice into interest calculations per year.
var compoundingPerYear = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  yearly: 1
};
// The timer handle lets a new toast message replace the previous timer.
var toastTimer;

// Find an HTML element by its id.
function getElement(id) {
  return document.getElementById(id);
}

// Update text only when that element exists on the current page.
function setText(id, text) {
  var element = getElement(id);
  if (element) {
    element.textContent = text;
  }
}

// Format a number as Philippine pesos with a chosen number of decimal places.
function formatPeso(value, decimalPlaces) {
  // Use two decimal places unless a whole-number display was requested.
  if (decimalPlaces === undefined) {
    decimalPlaces = 2;
  }

  return "₱" + Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
}

// Display a temporary message and hide it after a short delay.
function showToast(message) {
  var banner = getElement("toast-banner");
  var messageBox = getElement("toast-message");

  // About and other pages may not need a toast; do nothing if its HTML is absent.
  if (!banner || !messageBox) {
    return;
  }

  // Put the supplied message in the banner and make it visible through CSS.
  messageBox.textContent = message;
  banner.classList.add("visible");

  // Cancel the previous hide timer so a new message remains visible long enough.
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    banner.classList.remove("visible");
  }, 2600);
}

// Calculate the final balance and create one data point for each month.
function calculateGrowth(principal, annualRate, months, regularAddition, additionFrequency, compoundingFrequency, firstLoad) {
  // Look up how often deposits and interest compounding happen in a year.
  var paymentsPerYearValue = paymentsPerYear[additionFrequency];
  var compoundPeriods = compoundingPerYear[compoundingFrequency];
  // Periodic compound-interest rate is the annual rate divided by periods/year.
  var compoundBase = 1 + annualRate / 100 / compoundPeriods;
  // Count complete scheduled deposits within the selected number of months.
  var totalPayments = Math.floor(months * paymentsPerYearValue / 12 + 0.0000001);
  // Grow the starting principal through the full investment period.
  var finalAmount = principal * Math.pow(compoundBase, months * compoundPeriods / 12);
  var totalInvested = principal;
  var payment;
  var paymentMonth;
  var points = [];
  var month;
  var value;
  var addedThisMonth;
  var paymentCount;
  var label;

  // Add each scheduled deposit and grow it for the time remaining afterward.
  for (payment = 1; payment <= totalPayments; payment += 1) {
    paymentMonth = payment * 12 / paymentsPerYearValue;
    finalAmount += regularAddition * Math.pow(compoundBase, (months - paymentMonth) * compoundPeriods / 12);
  }

  // Recalculate from the starting principal up to each month for the graph/table.
  for (month = 1; month <= months; month += 1) {
    // Grow the original deposit to the end of this month.
    value = principal * Math.pow(compoundBase, month * compoundPeriods / 12);
    totalInvested = principal;
    addedThisMonth = 0;
    // Deposits made so far are included in this month's total.
    paymentCount = Math.floor(month * paymentsPerYearValue / 12 + 0.0000001);

    // Add each contribution and its interest growth to the current month value.
    for (payment = 1; payment <= paymentCount; payment += 1) {
      paymentMonth = payment * 12 / paymentsPerYearValue;
      value += regularAddition * Math.pow(compoundBase, (month - paymentMonth) * compoundPeriods / 12);
      totalInvested += regularAddition;
      // Mark deposits that fall within this month for the "Added" table column.
      if (paymentMonth > month - 1) {
        addedThisMonth += regularAddition;
      }
    }

    // Repeat month names for longer plans and add a year marker after 12 months.
    label = monthNames[(month - 1) % 12];

    if (months > 12) {
      label += " Y" + Math.ceil(month / 12);
    }

    // Save the figures used later by the graph and monthly table.
    points.push({
      month: month,
      label: label,
      added: addedThisMonth,
      invested: totalInvested,
      interest: value - totalInvested,
      value: Number(value.toFixed(2))
    });
  }

  // Store the inputs and calculated totals so other page functions can use them.
  appState.principal = principal;
  appState.annualRate = annualRate;
  appState.months = months;
  appState.regularAddition = regularAddition;
  appState.additionFrequency = additionFrequency;
  appState.compoundingFrequency = compoundingFrequency;
  appState.finalAmount = finalAmount;
  // Interest earned is the ending value less all money deposited.
  appState.totalEarned = finalAmount - principal - regularAddition * totalPayments;
  // Keep the original display values on the untouched first page load.
  appState.monthlyGrowth = firstLoad ? 37.5 : (finalAmount - principal - regularAddition * totalPayments) / months;
  appState.dailyEarnings = firstLoad ? 0.62 : (finalAmount - principal - regularAddition * totalPayments) / (months * 30);
  appState.points = points;
}

// Save the calculator settings so the dashboard can show the same projection.
function saveCalculation() {
  try {
    // Only the inputs are needed; results can be recalculated on the next page.
    var calculation = {
      principal: appState.principal,
      annualRate: appState.annualRate,
      months: appState.months,
      regularAddition: appState.regularAddition,
      additionFrequency: appState.additionFrequency,
      compoundingFrequency: appState.compoundingFrequency
    };

    // localStorage keeps this small settings object between page navigations.
    window.localStorage.setItem("raiseUpCalculation", JSON.stringify(calculation));
  } catch (error) {
    // Report storage problems instead of silently pretending the save worked.
    console.error("Unable to save the calculation for other pages.", error);
  }
}

// Copy current results into any matching dashboard/calculator elements.
function updatePage(firstLoad) {
  // Dashboard metric cards and the graph duration badge.
  setText("dash-total-revenue", formatPeso(appState.finalAmount));
  setText("dash-last-month-diff", "+ " + formatPeso(appState.monthlyGrowth) + " from last month");
  setText("dash-growth-val", formatPeso(appState.monthlyGrowth));
  setText("dash-growth-sub", "+" + appState.months + " Month" + (appState.months === 1 ? "" : "s") + " of Progress");
  setText("dash-daily-val", formatPeso(appState.dailyEarnings));
  setText("dash-rate-val", appState.annualRate + "%");
  setText("dash-total-earned-pill", formatPeso(appState.totalEarned));
  setText("chart-range-badge", appState.months + "-Month Compound Curve");

  // On first load, show the starting principal; after calculating, show final value.
  if (firstLoad) {
    setText("calc-res-total", formatPeso(appState.principal, 0));
  } else {
    setText("calc-res-total", formatPeso(appState.finalAmount));
  }
  setText("calc-res-rate", appState.annualRate + "%");
  setText("calc-res-monthly", formatPeso(appState.monthlyGrowth));
  setText("calc-res-earned-note", "Total earned: " + formatPeso(appState.totalEarned));

  // Refresh graph and table from the latest month data.
  drawChart();
}

// Read the calculator fields, validate them, and calculate the projection.
function handleCalculate(event) {
  // Stop the form from navigating away or refreshing the page.
  event.preventDefault();

  // Convert the text-field values into numbers for arithmetic.
  var amount = Number(getElement("calc-amount").value);
  var interest = Number(getElement("calc-interest").value);
  var months = Number(getElement("calc-months").value);
  var addition = Number(getElement("calc-addition").value);
  var additionFrequency = getElement("calc-addition-frequency").value;
  var compoundingFrequency = getElement("calc-compounding").value;

  // Reject empty, non-numeric, negative, or out-of-range values before calculating.
  if (
    !Number.isFinite(amount) || amount <= 0 ||
    !Number.isFinite(interest) || interest < 0 || interest > 100 ||
    !Number.isFinite(addition) || addition < 0 ||
    !Number.isInteger(months) || months < 1 || months > 600
  ) {
    showToast("Enter a starting amount, a valid interest rate, and an addition of zero or more.");
    return;
  }

  // Confirm the selected dropdown values match a supported schedule.
  if (!paymentsPerYear[additionFrequency] || !compoundingPerYear[compoundingFrequency]) {
    showToast("Choose a valid addition and compounding schedule.");
    return;
  }

  // Update shared results and reflect them in the current calculator page.
  calculateGrowth(amount, interest, months, addition, additionFrequency, compoundingFrequency, false);
  updatePage(false);
  // Save calculator settings only when the user submits the calculator form.
  saveCalculation();

  showToast("Calculated " + months + "-month growth: " + formatPeso(appState.finalAmount));
}

// Apply the selected dashboard duration to the current saved investment settings.
function applyDashboardFilter() {
  var timeframe = getElement("timeframe-select");
  var months;

  // The function is also loaded on pages without the dashboard dropdown.
  if (!timeframe) {
    return;
  }

  months = Number(timeframe.value);
  // Check that the selected duration is a whole number in the supported range.
  if (!Number.isInteger(months) || months < 1 || months > 600) {
    showToast("Please select a valid number of months.");
    return;
  }

  // Recalculate using the current principal, rate, deposit, and schedules.
  calculateGrowth(
    appState.principal,
    appState.annualRate,
    months,
    appState.regularAddition,
    appState.additionFrequency,
    appState.compoundingFrequency,
    false
  );
  updatePage(false);
  showToast("Filtered dashboard for " + months + " months");
}

// Draw the SVG projection and fill the month-by-month table from appState.
function drawChart() {
  // Find graph and table targets; pages without them can safely skip rendering.
  var chart = getElement("growth-line-chart");
  var tableBody = getElement("monthly-table-body");
  // These dimensions match the coordinate system set by the SVG viewBox.
  var width = 600;
  var height = 300;
  var left = 82;
  var right = 20;
  var top = 28;
  var bottom = 54;
  var plotWidth = width - left - right;
  var plotHeight = height - top - bottom;
  // Add some headroom above the final value so the graph does not touch the top.
  var maximum = appState.finalAmount * 1.08;
  // Round the vertical scale to readable hundred-peso intervals.
  var tickStep = Math.ceil(maximum / 5 / 100) * 100;
  var tickCount = Math.ceil(maximum / tickStep);
  var range = tickCount * tickStep;
  var content = "";
  var areaContent = "";
  var step;
  var y;
  var tick;
  var pointIndex;
  var point;
  var x;
  var points = [];
  var interestPath = "";
  var investedPath = "";
  var interestArea;
  var investedArea;
  var tickLabel;
  var xLabels = [];
  var labelCount;
  var labelIndex;
  var currentMonth;
  var interest;
  var row;

  // Stop when neither view exists or there is no data to show.
  if ((!chart && !tableBody) || appState.points.length === 0) {
    return;
  }

  // Build chart labels, axes, and colored investment/interest areas if present.
  if (chart) {
    // Draw horizontal guide lines and peso labels along the value axis.
    for (step = 0; step <= tickCount; step += 1) {
      tick = step * tickStep;
      y = top + plotHeight - tick / range * plotHeight;
      tickLabel = formatPeso(tick, 0);
      content += '<line x1="' + left + '" y1="' + y.toFixed(1) + '" x2="' + (width - right) + '" y2="' + y.toFixed(1) + '" stroke="#D8E0E5" stroke-width="1"></line>';
      content += '<text class="chart-axis-label" x="' + (left - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + tickLabel + "</text>";
    }

    // Draw the left and bottom axes, then label both axes and the two colors.
    content += '<line x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + (top + plotHeight) + '" stroke="#536573" stroke-width="1.2"></line>';
    content += '<line x1="' + left + '" y1="' + (top + plotHeight) + '" x2="' + (width - right) + '" y2="' + (top + plotHeight) + '" stroke="#536573" stroke-width="1.2"></line>';
    content += '<text class="chart-axis-title" x="21" y="' + (top + plotHeight / 2) + '" text-anchor="middle" transform="rotate(-90 21 ' + (top + plotHeight / 2) + ')">Total Value</text>';
    content += '<text class="chart-axis-title" x="' + (left + plotWidth / 2) + '" y="' + (height - 7) + '" text-anchor="middle">Months</text>';
    content += '<rect x="' + (left + 14) + '" y="12" width="13" height="13" fill="#12b6d2"></rect>';
    content += '<text class="chart-legend" x="' + (left + 34) + '" y="23">Total invested</text>';
    content += '<rect x="' + (left + 174) + '" y="12" width="13" height="13" fill="#36718c"></rect>';
    content += '<text class="chart-legend" x="' + (left + 194) + '" y="23">Interest earned</text>';

    // Convert each month's money values into SVG coordinates.
    for (pointIndex = 0; pointIndex < appState.points.length; pointIndex += 1) {
      point = appState.points[pointIndex];
      x = left + (point.month / appState.months) * plotWidth;
      points.push({
        x: x,
        investedY: top + plotHeight - point.invested / range * plotHeight,
        interestY: top + plotHeight - point.interest / range * plotHeight,
        label: point.label
      });
    }

    // Add the starting balance at month zero so both filled areas start correctly.
    points.unshift({
      x: left,
      investedY: top + plotHeight - appState.principal / range * plotHeight,
      interestY: top + plotHeight,
      label: "Start"
    });

    // Build SVG path instructions by connecting each month in order.
    for (pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      point = points[pointIndex];
      interestPath += (pointIndex === 0 ? "M " : "L ") + point.x.toFixed(1) + " " + point.interestY.toFixed(1) + " ";
      investedPath += (pointIndex === 0 ? "M " : "L ") + point.x.toFixed(1) + " " + point.investedY.toFixed(1) + " ";
    }

    // Close the invested-value shape along the bottom of the graph.
    investedArea = investedPath +
      "L " + points[points.length - 1].x.toFixed(1) + " " + (top + plotHeight).toFixed(1) +
      " L " + points[0].x.toFixed(1) + " " + (top + plotHeight).toFixed(1) + " Z";
    // Close the interest shape along the bottom; it starts at zero interest.
    interestArea = interestPath +
      "L " + points[points.length - 1].x.toFixed(1) + " " + (top + plotHeight).toFixed(1) +
      " L " + points[0].x.toFixed(1) + " " + (top + plotHeight).toFixed(1) + " Z";
    // Draw invested money first, then interest on top of it as a separate area.
    areaContent += '<path d="' + investedArea + '" fill="#12b6d2"></path>';
    areaContent += '<path d="' + interestArea + '" fill="#36718c"></path>';

    // Limit month numbers to ten labels so the axis stays readable on long plans.
    labelCount = Math.min(appState.months, 10);
    for (labelIndex = 0; labelIndex < labelCount; labelIndex += 1) {
      // Spread the labels across the full duration, including its first and last month.
      if (labelCount === 1) {
        currentMonth = 1;
      } else {
        currentMonth = Math.round(1 + labelIndex * (appState.months - 1) / (labelCount - 1));
      }
      // Rounding can repeat a month number; only add each label once.
      if (xLabels.indexOf(currentMonth) === -1) {
        xLabels.push(currentMonth);
      }
    }

    // Place month numbers along the bottom axis.
    for (labelIndex = 0; labelIndex < xLabels.length; labelIndex += 1) {
      currentMonth = xLabels[labelIndex];
      x = left + (currentMonth / appState.months) * plotWidth;
      content += '<text class="chart-axis-label" x="' + x.toFixed(1) + '" y="' + (top + plotHeight + 23) + '" text-anchor="middle">' + currentMonth + "</text>";
    }

    // Put colored areas first so axes, labels, and legend remain visible above them.
    chart.innerHTML = areaContent + content;
  }

  // Rebuild every data row to ensure the table matches the graph's current inputs.
  if (tableBody) {
    tableBody.innerHTML = "";
    for (pointIndex = 0; pointIndex < appState.points.length; pointIndex += 1) {
      point = appState.points[pointIndex];
      interest = point.interest;
      // Make a row containing the month, this month's deposit, and cumulative totals.
      row = document.createElement("tr");
      row.innerHTML =
        "<td>" + point.month + "</td>" +
        "<td>" + formatPeso(point.added) + "</td>" +
        "<td>" + formatPeso(point.invested) + "</td>" +
        "<td>" + formatPeso(interest) + "</td>" +
        "<td>" + formatPeso(point.value) + "</td>";
      tableBody.appendChild(row);
    }
  }
}

// Switch between the graph and monthly table, including their accessibility states.
function selectProjectionTab(event) {
  var selectedTab = event.currentTarget;
  var graphTab = getElement("graph-tab");
  var tableTab = getElement("table-tab");
  var graphPanel = getElement("graph-panel");
  var tablePanel = getElement("table-panel");
  // The clicked button's id determines which panel should be visible.
  var showGraph = selectedTab.id === "graph-tab";

  // Toggle active styling and tell assistive technology which tab is selected.
  graphTab.classList.toggle("active", showGraph);
  tableTab.classList.toggle("active", !showGraph);
  graphTab.setAttribute("aria-selected", String(showGraph));
  tableTab.setAttribute("aria-selected", String(!showGraph));
  // The hidden property removes the inactive panel from the visible page.
  graphPanel.hidden = !showGraph;
  tablePanel.hidden = showGraph;
}

// Restore saved calculator settings, or return safe defaults when data is invalid.
function loadCalculation() {
  var saved;

  // Reading storage may fail in restricted browsers, so handle that explicitly.
  try {
    saved = JSON.parse(window.localStorage.getItem("raiseUpCalculation"));
  } catch (error) {
    console.error("Unable to restore the saved calculation.", error);
    return null;
  }

  // No saved object means this is a first visit.
  if (!saved) {
    return null;
  }
  // Check each number before using saved data in financial calculations.
  if (!Number.isFinite(saved.principal) || saved.principal <= 0) {
    return null;
  }
  if (!Number.isFinite(saved.annualRate) || saved.annualRate < 0 || saved.annualRate > 100) {
    return null;
  }
  if (!Number.isInteger(saved.months) || saved.months < 1 || saved.months > 600) {
    return null;
  }

  // Add defaults for settings that older saved versions did not contain.
  if (saved.regularAddition === undefined) {
    saved.regularAddition = 0;
  }
  if (!Number.isFinite(saved.regularAddition) || saved.regularAddition < 0) {
    return null;
  }
  // Replace unknown schedule names with supported monthly defaults.
  if (!paymentsPerYear[saved.additionFrequency]) {
    saved.additionFrequency = "monthly";
  }
  if (!compoundingPerYear[saved.compoundingFrequency]) {
    saved.compoundingFrequency = "monthly";
  }

  return saved;
}

// Prepare the current page: wire buttons, restore inputs, then calculate/render.
function startPage() {
  // Locate elements that only exist on particular pages.
  var form = getElement("calculator-form");
  var filterButton = getElement("dashboard-filter");
  var saved = loadCalculation();
  var firstLoad = !saved;
  var principal = saved ? saved.principal : 5000;
  var annualRate = saved ? saved.annualRate : 4.5;
  var months = saved ? saved.months : 3;
  var regularAddition = saved ? saved.regularAddition : 0;
  var additionFrequency = saved ? saved.additionFrequency : "monthly";
  var compoundingFrequency = saved ? saved.compoundingFrequency : "monthly";
  var amountInput = getElement("calc-amount");
  var rateInput = getElement("calc-interest");
  var monthsInput = getElement("calc-months");
  var additionInput = getElement("calc-addition");
  var additionFrequencyInput = getElement("calc-addition-frequency");
  var compoundingInput = getElement("calc-compounding");
  var timeframe = getElement("timeframe-select");
  var graphTab = getElement("graph-tab");
  var tableTab = getElement("table-tab");

  // Connect the calculator submit and dashboard filter to their functions.
  if (form) {
    form.addEventListener("submit", handleCalculate);
  }
  if (filterButton) {
    filterButton.addEventListener("click", applyDashboardFilter);
  }
  if (graphTab) {
    graphTab.addEventListener("click", selectProjectionTab);
  }
  if (tableTab) {
    tableTab.addEventListener("click", selectProjectionTab);
  }
  // Restore input values only on the calculator page where those fields exist.
  if (amountInput) {
    amountInput.value = String(principal);
  }
  if (rateInput) {
    rateInput.value = String(annualRate);
  }
  if (monthsInput) {
    monthsInput.value = String(months);
  }
  if (additionInput) {
    additionInput.value = String(regularAddition);
  }
  if (additionFrequencyInput) {
    additionFrequencyInput.value = additionFrequency;
  }
  if (compoundingInput) {
    compoundingInput.value = compoundingFrequency;
  }
  // Select a matching dashboard preset when the saved month count is available.
  if (timeframe && (months === 1 || months === 3 || months === 6 || months === 12)) {
    timeframe.value = String(months);
  }

  // Calculate restored/default data and update whichever page is currently open.
  calculateGrowth(principal, annualRate, months, regularAddition, additionFrequency, compoundingFrequency, firstLoad);
  updatePage(firstLoad);
}

// Wait until the HTML is ready before looking up elements and attaching handlers.
document.addEventListener("DOMContentLoaded", startPage);
