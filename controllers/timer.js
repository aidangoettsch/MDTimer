module.exports = function (app) {
  var controller = {
    router: {}
  };
  controller.router.getIndex = function(req, res) {
    res.render("timer/timer", {title: "MDTimer"});
  };
  return controller;
};