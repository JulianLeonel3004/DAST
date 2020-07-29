const express = require("express");
const app = express();
const spider = require("./services/spider");
var routes = require("./routes/routes.js");


routes(app);

app.listen(8080,()=>{
    console.log("Servidor activo");

   setInterval(spider.changeState,10000);
});



