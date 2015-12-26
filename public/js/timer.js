var timerState = "standby";
var solveTimer;
var inspectionTimer;
var startingTimer;
var timerStartTime;
var inspectionTargetTime;
var currentSolveTime;
var currentInspectionTime;
var emptySolve = {
  time: 0,
  date: {},
  plus2: false,
  dnf: false,
  comment: "",
  scramble: ""
};
var currentSolve = $.extend(true, {}, emptySolve);
var sessions = [];
var currentSession = 0;
var emptySession = {
  name: "",
  scrambleType: "",
  solves: []
};
sessions[0] = $.extend(true, {}, emptySession);
sessions[0].name = "1";
sessions[1] = $.extend(true, {}, emptySession);
sessions[1].name = "2";
var scrambleTypes = [
  {name: "222", humanReadableName: "2x2"},
  {name: "333", humanReadableName: "3x3"},
  {name: "444", humanReadableName: "4x4"},
  {name: "555", humanReadableName: "5x5"},
  {name: "666", humanReadableName: "6x6"},
  {name: "777", humanReadableName: "7x7"},
  {name: "minx", humanReadableName: "Megaminx"},
  {name: "pyra", humanReadableName: "Pyraminx"},
  {name: "sq1", humanReadableName: "Square-1"},
  {name: "skewb", humanReadableName: "Skewb"},
  {name: "clock", humanReadableName: "Clock"}
];
var storageObject = [];
var averages = [{type: "mean", amount: 3}, {type: "average", amount: 5}, {type: "average", amount: 12}, {type: "average", amount: 50}, {type: "average", amount: 100}];
var currentScramble = "";

$(document).keydown(function (e) {
  if (e.keyCode == 32) {
    keyDown();
  }
});

$(document).bind('touchstart', function(e){
  keyDown();
});

function keyDown() {
  switch (timerState) {
    case "active":
      clearInterval(solveTimer);
      break;
    case "standby":
      colorTimer("ready");
      break;
    case "inspecting":
      timerState = "starting";
      colorTimer("hold-more");
      startingTimer = setTimeout(function () {
        timerState = "ready";
        colorTimer("ready");
      }, 500);
      break;
  }
}

$(document).keyup(function (e) {
  if (e.keyCode == 32) {
    keyUp();
  }
});

$(document).bind('touchend', function(e){
  keyUp();
});

function keyUp() {
  switch (timerState) {
    case "active":
      timerState = "standby";
      storeSolve();
      break;
    case "standby":
      timerState = "inspecting";
      colorTimer("active");
      inspectionTargetTime = new Date().getTime() + 15000;
      inspectionTimer = setInterval(function () {
        currentInspectionTime = inspectionTargetTime - new Date().getTime();
        if (currentInspectionTime >= -2000 && currentInspectionTime < 0) {
          currentSolve.plus2 = true;
          colorTimer("inspection-penalty");
        }
        else if (currentInspectionTime < 0) {
          currentSolve.dnf = true;
          currentSolve.plus2 = false;
        }
        updateTimer();
      }, 1);
      break;
    case "starting":
      timerState = "inspecting";
      if (currentInspectionTime > 0) colorTimer("active");
      else colorTimer("inspection-penalty");
      clearTimeout(startingTimer);
      break;
    case "ready":
      timerState = "active";
      colorTimer("active");
      timerStartTime = new Date().getTime();
      clearInterval(inspectionTimer);
      solveTimer = setInterval(function () {
        currentSolveTime = new Date().getTime() - timerStartTime;
        updateTimer();
      }, 1)
  }
}

function updateTimer() {
  switch (timerState) {
    case "active":
      $(".timer-text").text(formatTime(currentSolveTime));
      break;
    case "inspecting":
      if (currentInspectionTime >= 0) $(".timer-text").text(formatTime(currentInspectionTime/1000));
      else if (currentInspectionTime >= -2000) $(".timer-text").text("+2");
      else $(".timer-text").text("DNF");
  }
}

function formatTime(time) {
  switch (timerState) {
    case "active":
      return formatActiveTime(time);
      break;
    case "inspecting":
      return Math.floor(time) + 1;
      break;
  }
}

function formatActiveTime(time) {
  var minutes = Math.floor(time/60000);
  var hours = Math.floor(minutes/60);
  var seconds = ((time) - (minutes * 60000))/1000;
  minutes -= hours*60;
  seconds = seconds.toFixed(3);
  if (minutes < 10 && hours > 0) minutes = "0" + minutes;
  if (seconds < 10 && minutes > 0) seconds = "0" + seconds;
  if (hours > 0) return hours + ":" + minutes + ":" + seconds;
  else if (minutes > 0) return minutes + ":" + seconds;
  else return seconds;
}

function colorTimer(state) {
  switch (state) {
    case "ready":
      $(".timer-text").toggleClass("timer-ready", true);
      $(".timer-text").toggleClass("timer-inspection-penalty", false);
      $(".timer-text").toggleClass("timer-hold-more", false);
      break;
    case "inspection-penalty":
      $(".timer-text").toggleClass("timer-inspection-penalty", true);
      $(".timer-text").toggleClass("timer-ready", false);
      $(".timer-text").toggleClass("timer-hold-more", false);
      break;
    case "hold-more":
      $(".timer-text").toggleClass("timer-hold-more", true);
      $(".timer-text").toggleClass("timer-ready", false);
      $(".timer-text").toggleClass("timer-inspection-penalty", false);
      break;
    case "active":
      $(".timer-text").toggleClass("timer-ready", false);
      $(".timer-text").toggleClass("timer-inspection-penalty", false);
      $(".timer-text").toggleClass("timer-hold-more", false);
      break;
  }
}

function storeSolve() {
  currentSolve.scramble = currentScramble;
  currentSolve.time = currentSolveTime;
  currentSolve.date = new Date();
  addSolveLs(currentSolve);
  currentSolve = $.extend(true, {}, emptySolve);
  updateStatistics();
  nextScramble();
}

$(function () {
  setupLocalStorage();
  updateSessions();
  updateStatistics();
  loadScrambleTypes();
  nextScramble();
  $(".new-session").click(function () {
    document.getElementById("newSession").open();
  });
  $(".create-session").click(function () {
    var name = document.getElementsByClassName("new-session-name")[0].value;
    var scrambleType =$(".new-session-scramble-type paper-menu").get(0).selected;
    if (name == "") name = "Unnamed";
    if (scrambleType == undefined) scrambleType = "none";
    else scrambleType = scrambleTypes[scrambleType];
    var newSession = $.extend(true, {}, emptySession);
    newSession.name = name;
    newSession.scrambleType = scrambleType.name;
    addSessionLs(newSession);
    updateSessions();
    document.getElementById("newSession").close();
    document.getElementsByClassName("new-session-name")[0].value = "";
    document.getElementsByClassName("new-session-scramble-type")[0].selected = -1;
    currentSession = document.getElementsByClassName("session-selector")[0].selected = storageObject.length - 1;
    nextScramble();
  });
  $(".session-selector").on("iron-select", function () {
    currentSession = document.getElementsByClassName("session-selector")[0].selected;
    nextScramble();
  });
  $(".see-more-button").click(function () {
    document.getElementById("statsDialog").open();
  });
  $(".settings-item").click(function () {
    document.getElementById("settingsDialog").open();
  });
  $(".stats-tabs").on("iron-select", function () {
    document.getElementsByClassName("stats-pages")[0].selected = document.getElementsByClassName("stats-tabs")[0].selected;
  });
  $(".settings-tabs").on("iron-select", function () {
    document.getElementsByClassName("settings-pages")[0].selected = document.getElementsByClassName("settings-tabs")[0].selected;
  });
});

function updateSessions() {
  var sessionHtml = "<paper-menu class='session-selector' selected='" + currentSession + "'>";
  for (var session in storageObject) {
    session = storageObject[session];
    sessionHtml = sessionHtml + "<paper-item>" + session.name + "</paper-item>";
  }
  $(".session-selector-container").html(sessionHtml + "</paper-menu>");
  $(".session-selector").on("iron-select", function () {
    currentSession = document.getElementsByClassName("session-selector")[0].selected;
    nextScramble();
  });
}

function loadScrambleTypes() {
  var scrambleHtml = "";
  for (var scrambleType in scrambleTypes) {
    scrambleType = scrambleTypes[scrambleType];
    scrambleHtml = scrambleHtml + "<paper-item>" + scrambleType.humanReadableName + "</paper-item>";
  }
  $(".session-scramble-selector").html(scrambleHtml);
}

function setupLocalStorage() {
  if (window.localStorage.getItem("storageActive") === null) {
    var newSession = $.extend(true, {}, emptySession);
    newSession.name = "Default";
    newSession.scrambleType = "333";
    window.localStorage.setItem("sessions", JSON.stringify(storageObject));
    addSessionLs(newSession);
    window.localStorage.setItem("storageActive", "true");
  } else loadLs();
}

function loadLs() {
  storageObject = JSON.parse(window.localStorage.getItem("sessions"));
}

function addSessionLs(session) {
  storageObject = JSON.parse(window.localStorage.getItem("sessions"));
  storageObject[storageObject.length] = session;
  window.localStorage.setItem("sessions", JSON.stringify(storageObject));
}

function editSessionLs(id, updatedSession) {
  storageObject = JSON.parse(window.localStorage.getItem("sessions"));
  storageObject[id] = updatedSession;
  window.localStorage.setItem("sessions", JSON.stringify(storageObject));
}

function delSessionLs(id) {
  storageObject = JSON.parse(window.localStorage.getItem("sessions"));
  storageObject.splice(0, id);
  window.localStorage.setItem("sessions", JSON.stringify(storageObject));
}

function addSolveLs(solve) {
  storageObject = JSON.parse(window.localStorage.getItem("sessions"));
  storageObject[currentSession].solves[storageObject[currentSession].solves.length] = solve;
  window.localStorage.setItem("sessions", JSON.stringify(storageObject));
}

function editSolveLs(id, updatedSolve) {
  storageObject = JSON.parse(window.localStorage.getItem("sessions"));
  storageObject[currentSession].solves[id] = updatedSolve;
  window.localStorage.setItem("sessions", JSON.stringify(storageObject));
}

function delSolveLs(id) {
  storageObject = JSON.parse(window.localStorage.getItem("sessions"));
  storageObject[currentSession].solves.splice(0, id);
  window.localStorage.setItem("sessions", JSON.stringify(storageObject));
}

function updateStatistics() {
  for (var average in averages) {
    average = averages[average];
    if (storageObject[currentSession].solves.length >= average.amount) displayAverages(average.type, average.amount, calculateAverages(average.type, average.amount));
    else {
      var averageString = average.amount;
      switch (average.type) {
        case "mean":
          averageString = "mo" + averageString;
          break;
        case "average":
          averageString = "ao" + averageString;
          break;
      }
      $("#sidebar" + averageString).toggleClass("average-hidden", true);
      $("#dialog" + averageString).toggleClass("average-hidden", true);
    }
  }
  plotGraphs();
  updateTimeList();
}

function updateTimeList() {
  var timesHtml = "";
  var solves = storageObject[currentSession].solves;
  for (var solve in solves) {
    var solveId = solve;
    solve = solves[solve];
    timesHtml = timesHtml + "<paper-item class='solve-item' id='" + solveId + "'>" + formatActiveTime(solve.time) + "</paper-item>";
  }
  $(".times").html(timesHtml);
}

function calculateAverage(type, amount, startingPoint) {
  var solves = storageObject[currentSession].solves.slice(startingPoint, startingPoint + amount);
  if (type == "average") {
    var excludedSolves = Math.ceil(amount * 0.05);
    solves = solves.slice(excludedSolves - 1, amount - (excludedSolves * 2));
  }
  var timeTotals = 0;
  for (var solve in solves) {
    solve = solves[solve];
    timeTotals += solve.time;
  }
  return timeTotals / solves.length;
}

function calculateAverages(type, amount) {
  var solves = storageObject[currentSession].solves;
  var averages = [];
  for (var x = 0; x <= solves.length - amount && solves.length - amount >= 0; x++) {
    averages[averages.length] = calculateAverage(type, amount, x);
  }
  var current = averages[averages.length - 1];
  averages.sort(function (a, b) {
    return a - b;
  });
  var best = averages[0];
  var returnObj = {
    best: best,
    current: current,
    averages: averages
  };
  return returnObj;
}

function displayAverages(type, amount, averages) {
  var averageString = amount;
  switch (type) {
    case "mean":
      averageString = "mo" + averageString;
      break;
    case "average":
      averageString = "ao" + averageString;
      break;
  }
  $("#sidebar" + averageString).toggleClass("average-hidden", false);
  $("#dialog" + averageString).toggleClass("average-hidden", false);
  $("#sidebar" + averageString + " .average-best .average-content").html(formatActiveTime(averages.best));
  $("#sidebar" + averageString + " .average-current .average-content").html(formatActiveTime(averages.current));
  $("#dialog" + averageString + " .average-best .average-content").html(formatActiveTime(averages.best));
  $("#dialog" + averageString + " .average-current .average-content").html(formatActiveTime(averages.current));
}

function plotGraphs() {
  var sidebarChart = document.getElementById("sidebarSolveGraph").getContext("2d");
  var testData = {
    labels: ["January", "February", "March", "April", "May", "June", "July"],
    datasets: [
      {
        label: "My First dataset",
        fillColor: "rgba(220,220,220,0.2)",
        strokeColor: "rgba(220,220,220,1)",
        pointColor: "rgba(220,220,220,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(220,220,220,1)",
        data: [65, 59, 80, 81, 56, 55, 40]
      },
      {
        label: "My Second dataset",
        fillColor: "rgba(151,187,205,0.2)",
        strokeColor: "rgba(151,187,205,1)",
        pointColor: "rgba(151,187,205,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(151,187,205,1)",
        data: [28, 48, 40, 19, 86, 27, 90]
      }
    ]
  };
  var chart = new Chart(sidebarChart).Line(testData);
}

function viewSolveDetail(solveId) {
  var solve = storageObject[currentSession].solves[solveId];
}

function nextScramble() {
  $(".scramble").text("Scrambling...");
  currentScramble = scramblers[storageObject[currentSession].scrambleType].getRandomScramble().scramble_string;
  $(".scramble").text(currentScramble);
}