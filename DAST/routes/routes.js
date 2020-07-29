const bodyParser = require('body-parser');
const Client = require('node-rest-client').Client;
const service = require('../services/spider')


const appRouter = function (app) {

  app.use(bodyParser.json()); // support json encoded bodies
  app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
 
  app.get("/", function(req, res) {
        res.status(200).send("Primer vista");

  });

  app.get("/spiderings/:spidering_id",function(req,res){

     service.getScanStatusById(req.params.spidering_id)
      .then(data=>{
          res.status(200).json(data);
      })
      .catch(err=>{
        res.status(400).send(err);
      });
  });

  app.get("/spiderings/:spidering_id/result",function(req, res){
    

    service.getScanById(req.params.spidering_id)
    .then(data=>{
      res.status(200).send(data);
      
    })
    .catch(err=>{
      res.status(400).send(err);
    });


  });

  app.post("/scan",async function(req,res,next){

    try{
        var url = await Promise.resolve(req.body.url);   
        service.spider(url)
        .then(data=>{
          res.status(201).json(data);
        })
        .catch(err=>{
          res.status(400).json(err);
        })

    }
    catch(err){
      next(err);
    }


  });
/*
  app.get("/report/:spidering_id",function(req,res){
    var spiderId = req.params.spidering_id;

    service.report(spiderId)
    .then(data=>{
      res.status(200).send(data);
    })
    .catch(data=>{
      res.status(400).send(data);
    })
  });
**/
    
}


module.exports = appRouter;