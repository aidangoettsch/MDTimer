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
  {name: "333", humanReadableName: "3x3"}
];
var storageObject = [];

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
      break;
    case "inspecting":
      return Math.floor(time) + 1;
      break;
  }
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
  //TODO: Change this when scrambles are properly added.
  //currentSolve.scramble = scramble;
  currentSolve.time = currentSolveTime;
  addSolveLs(currentSolve);
  currentSolve = $.extend(true, {}, emptySolve);
}

$(function () {
  setupLocalStorage();
  updateSessions();
  loadScrambleTypes();
  $(".new-session").click(function () {
    document.getElementById("newSession").open();
  });
  $(".create-session").click(function () {
    var name = document.getElementsByClassName("new-session-name")[0].value;
    var scrambleType = document.getElementsByClassName("new-session-scramble-type")[0].selectedItem;
    if (name == "") name = "Unnamed";
    if (scrambleType == "") scrambleType = "none";
    else scrambleType = scrambleTypes[scrambleType];
    var newSession = $.extend(true, {}, emptySession);
    newSession.name = name;
    newSession.scrambleType = scrambleType;
    addSessionLs(newSession);
    updateSessions();
    document.getElementById("newSession").close();
    document.getElementsByClassName("new-session-name")[0].value = "";
    document.getElementsByClassName("new-session-scramble-type")[0].selected = -1;
  });
  $(".session-selector").on("iron-select", function () {
    currentSession = document.getElementsByClassName("session-selector")[0].selected;
  });
});

function updateSessions() {
  var sessionHtml = "<paper-menu class='session-selector' selected='" + currentSession + "'>";
  for (var session in storageObject) {
    session = storageObject[session];
    sessionHtml = sessionHtml + "<paper-item>" + session.name + "</paper-item>";
  }
  $(".session-selector-container").html(sessionHtml + "</paper-menu>");
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