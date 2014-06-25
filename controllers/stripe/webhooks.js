// Using Express
app.post("/my/webhook/url", function(request, response) {
  // Retrieve the request's body and parse it as JSON
  var event_json = JSON.parse(request.body);

  // Do something with event_json

  response.send(200);
});
