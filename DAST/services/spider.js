const dataBase = require('../db/dataBase');
var mysql = require('../db/dataBase');
var Client = require('node-rest-client-promise').Client;
var client = new Client();
//const environment = require('../environment.json');
const environment = require('../environment_prod.json');

const HOST = encodeURIComponent(environment.zap.HOST);
const PORT = encodeURIComponent(environment.zap.PORT);

const FIRST_PART_URL = "http://" + HOST + ":" + PORT;

const urlSpider = FIRST_PART_URL +"/JSON/spider/action/scan/?apikey=fookey&url=";
const urlScan =  FIRST_PART_URL +"/JSON/spider/view/scans/?apikey=fookey";
const urlReport = FIRST_PART_URL +"/OTHER/core/other/jsonreport/?apikey=fookey";

module.exports = {

    
    spider: function (url) {
        
        var urlTransform = buildUrl(url);

        return new Promise((resolve,reject)=>{

            new Promise((res)=>{

                client.get(urlSpider+urlTransform, (dataSpider,response)=>{
                    if(dataSpider)
                        res(dataSpider.scan);//scanId
                });

            })
            .then(scanId=>{

                client.get(urlScan,(data)=>{
                        
                        
                    var count = 0;

                    data.scans.forEach(element => {
                            
                        if(element.id == scanId.toString())
                            index = count; 
                        count = count + 1;
                    });

                    let status = data.scans[index].state

                    dataBase.insertScans(url,status)
                    .then(scanIdDB=>{
                        dataBase.insertScansApi(scanIdDB,scanId) 
                        .then(()=>{
                                
                            client.get(urlReport,(data)=>{
                                let vulnerabilities = [];

                                vulnerabilities =  obtainVulnetabilities(data.site,url)    

                                if(vulnerabilities.length > 0){

                                    dataBase.insertVulnerabilities(vulnerabilities)
                                    .then(idVulnerabilities=>{
                                            
                                        dataBase.insertRelationScanVulnerabilities(scanIdDB, idVulnerabilities)
                                        .then(()=>{
                                                
                                            resolve({
                                                "scan_id": scanIdDB, 
                                                "target": url,
                                                "status": status,
                                            });
                                        })
                                        .catch(err=>{
                                            reject(err);
                                        });
                                    })
                                    .catch(err=>{ 
                                        reject(err)
                                    })
                                       
                                }
                                else
                                {
                                    resolve({
                                        "scan_id": scanIdDB, 
                                        "target": url,
                                        "status": status,
                                    });
                                }

                                        
                            });
                            
                        })
                        .catch(err=>{
                            reject(err);
                        });
                               
                              
                    })
                    .catch(err=>{
                        reject(err);
                    });
                                
                            
                        
                });
            })
            .catch(data=>{
                reject(data);
            });

        });
   
    },

    changeState:function(){
        dataBase.getScansApi()
        .then((json)=>{


            let dbIds = [];
            let apiIds = []

            json.forEach(item=>{
                dbIds.push(item.dbId);
                apiIds.push(item.apiId);
            })

            //try{
                client.get(urlScan,(data)=>{
                            
                    if(data.scans.length > 0){
                        var index = 0;
                        var count = 0;
                        apiIds.forEach(item=>{
                        
                            index = data.scans.findIndex(scan=>scan.id == item);
                            
                            if(index>=0)
                            {
                                var scanId = dbIds[count];
                                if(data.scans[index].state == 'FINISHED')
                                    dataBase.deleteScanApi(scanId);

                                dataBase.updateScans(scanId,data.scans[index].state)
                                .then((resScanId)=>{
                                    dataBase.getTargetByScanId(resScanId)
                                    .then((target)=>{
                                        let targetJson =  JSON.parse(JSON.stringify(target));
                                        
                                        let url = targetJson[0].target

                                        client.get(urlReport,(data)=>{
                                            let vulnerabilities = [];

                                            
                                            vulnerabilities =  obtainVulnetabilities(data.site,url)    

                                            dataBase.insertVulnerabilities(vulnerabilities)
                                            .then(resVul=>{
                                                resVul.forEach(item=>{
                                                    dataBase.existRelation(resScanId,item)
                                                    .then(res=>{
                                                        if(!res){
                                                            dataBase.insertRelationScanVulnerabilities(resScanId, [item])
                                                        }
                                                        
                                                    })
                                                })
                                                console.log(resVul);
                                            })
                                            .catch(err=>{
                                                console.log(err);
                                            })
                                            
                                        });


                                    })
                                    .catch(err=>{
                                        console.log(err);
                                    })
                                })
                                .catch(err=>{console.log(err);});
                                
                            }

                            count = count + 1;
                    })

                    }
                })
               
            //}
           // catch(err){
             //   console.log("No se encontraron datos");
           // }
            
        })
        .catch(err=>{
            console.log(err);
        })

         
            
    },
    

    getScanStatusById:function(scanId){
        return new Promise((resolve,reject)=>{
            dataBase.getStatusById(scanId)
            .then(status=>{
                resolve({
                    "scan_id": scanId,
                    "status": status[0].status
                });
            })
            .catch(err=>{
                reject(err);
            })
        });
    },


    getScanById:function(scanId){
        return new Promise((resolve,reject)=>{
            dataBase.getTargetByScanId(scanId)
            .then(target=>{

                let targetJson =  JSON.parse(JSON.stringify(target));

                dataBase.getVulnerabilitiesByScanId(scanId)
                .then(vulnerabilities=>{
 
                    let vulnerabilitiesJson =  JSON.parse(JSON.stringify(vulnerabilities));

                    let descriptions = [];

                    vulnerabilitiesJson.forEach(item=>{
                        descriptions.push(item.description);
                    });

                    resolve({
                        "scan_id": scanId,
                        "target": targetJson[0].target,
                        "vulnerabilities":descriptions
                    });
                })
                .catch(err=>{
                    console.log(err);
                    reject(err);
                });
            })
            .catch(err=>{
                console.log(err);
                reject(err);
            })
        });
    }


}


function buildUrl(url){
    console.log(url);
    url = url.replace(/:/g,"%3A");
    url = url.replace(/\//g,"%2F");
    console.log(url);
    
    return url;
}


function obtainVulnetabilities(site,url){
    let vulnerabilities = [];

    if(url.substring(url.length-1,url.length) == '/')
        url = url.substring(0,url.length-1);

   
        site.forEach(item=>{

            if(item['@name'].indexOf(url) >= 0){
                
                item.alerts.forEach(alert=>{
                    
                    var desc = alert.desc.replace(/<p>/g,'');
                    desc = desc.substring(0,desc.length - 4);
                    vulnerabilities.push(desc);
                });
            }            
        });
    

    return vulnerabilities;
}

