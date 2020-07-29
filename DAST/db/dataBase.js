const mysql = require('mysql');
//const environment = require('../environment.json');
const environment = require('../environment_prod.json');

const HOST = encodeURIComponent(environment.mysql.HOST);
const PORT = encodeURIComponent(environment.mysql.PORT);
const USER =  encodeURIComponent(environment.mysql.USER);
const PASSWORD =  encodeURIComponent(environment.mysql.PASSWORD);
const DATABASE =  encodeURIComponent(environment.mysql.DATABASE);

module.exports = {

    getStatusById:function(scanId){
        return new Promise((resolve,reject)=>{
            conectionDB()
            .then(con=>{
                con.query("SELECT status FROM scans WHERE scanId = " + scanId, function(err,result){
                    con.end();
                    if(!err)
                        resolve(JSON.parse(JSON.stringify(result)));
                    else
                        reject(err)
                });
            })
            .catch(err=>{
                reject(err);
            })
        });
    },

    getTargetByScanId:function(scanId){
        return new Promise((resolve,reject)=>{
            conectionDB()
            .then(con=>{
                con.query("SELECT target FROM scans WHERE scanId = " +  scanId, function(err,result){
                    con.end();
                    if(!err){
                        resolve(result);
                    }
                    else
                        reject(err);
                })
            })
            .catch(err=>{
                reject(err);
            })
        });
    },


    getVulnerabilitiesByScanId:function(scanId){
        return new Promise((resolve,reject)=>{
            conectionDB()
            .then(connection=>{

                connection.beginTransaction(function(err) {
                    if (err) { throw err; }
                    connection.query("SELECT vulnerabilityId FROM scansVulnerabilities WHERE scanId = " + scanId, function(err, result) {
                      if (err) { 
                        connection.rollback(function() {
                          connection.end();
                          throw err;
                        });
                      }

                      if(result.length>0){
                            var val = JSON.stringify(result);
                            var json =  JSON.parse(val);

                            var query = buildQuerySelectVulnerabilityDescription(json);

                            connection.query(query,function(err,result){
                                if (err) { 
                                    connection.rollback(function() {
                                    connection.end();
                                    throw err;
                                    });
                                }

                                connection.commit(function(err){
                                    if(err){
                                        connection.rollback(function(){
                                            connection.end();
                                            throw err;
                                        });
                                    }
                                    resolve(result);
                                    connection.end();
                                })
                            });
                        }
                        else{
                            connection.commit(function(err){
                                if(err){
                                    connection.rollback(function(){
                                        connection.end();
                                        throw err;
                                    });
                                }
                                resolve(result);
                                connection.end();
                            })
                        }
                      

                    });
                });
            })
            .catch(err=>{
                reject(err);
            });
        });
    },

    insertScans: function(url,status){

        return new Promise((resolve,reject)=>{
           
            conectionDB()
            .then(con=>{

                ejecuteSelectMax("scanId","scans")
                .then((id)=>{
                    console.log(id);
                    var query = "INSERT INTO scans VALUES( " + id + ", '" + url + "', '" + status + "' )";

                    ejecuteQuery(con,query)
                    .then(()=>{
                        con.end();
                        resolve(id);
                        
                    })
                    .catch(err=>{
                        con.end();
                        reject(err);
                    });

                }).catch(err=>{
                    console.log(err);
                    reject(err);
                });
               
               
            })
            .catch(()=>{
                reject("error de conexión");
            });
        });
    },


    insertVulnerabilities: function(vulnerabilities){
       return new Promise((resolve,reject)=>{
            conectionDB()

            .then(con=>{

                const promesas = [];
                vulnerabilities.forEach(vulnerability => promesas.push( 
                    insertVulnetability(vulnerability,con)
                ));

                Promise.all(promesas).then(item=>{
                    con.end();
                    resolve(item);                    
                })
                .catch(err=>{
                    con.end();
                    reject(err);
                });               
                

            });

        });
    },

    insertRelationScanVulnerabilities: function(scanId, idVulnerabilities){
        return new Promise((resolve,reject)=>{
            var query = buildInsertRelation(scanId, idVulnerabilities);
            conectionDB()
            .then(con=>{
                ejecuteQuery(con,query)
                .then(ok=>{
                    con.end();
                    resolve(ok);
                })
                .catch(err=>{
                    con.end();
                    reject(err);
                })
            })
            .catch(err=>{
                reject(err);
            });
        });
    },


    insertScansApi: function(scanDB,scanApi){
        return new Promise((resolve,reject)=>{
            var query = buildInsertScansApiQuery(scanDB,scanApi);

            conectionDB()
            .then(con=>{
                con.query(query,function(err,result){
                    con.end();
                    if(!err)
                        resolve(result);
                    else
                        reject(err);
                });
                
            })
            .catch(err=>{
                reject(err);
            });
        });
    },


    getScansApi:function(){
        return new Promise((resolve,reject)=>{
            conectionDB()
            .then(con=>{

                con.query("SELECT * FROM scansApi",function(err,result){
                    
                    if(!err){
                        if( result != null){
                            var val = JSON.stringify(result);
                            var json =  JSON.parse(val);
                            
                            con.end();
                            resolve(json);
                        }
                    }   
                    else 
                        con.end();
                        reject(err);
                });
            })
            .catch(err=>{
                reject(err);
            });
        });
    },

    updateScans:function(scanId,status){
        return new Promise((resolve,reject)=>{
            conectionDB()
            .then(con=>{
                con.query("UPDATE scans SET status = '" + status + "' WHERE scanId = " + scanId, function(err,result){
                    con.end();
                    if(!err){
                        resolve(scanId)
                    }
                    else
                        reject(err)
                });
            })
            .catch(err=>{
                reject(err);
            });

        });
    },


    deleteScanApi:function(scanId){
        conectionDB()
        .then(con=>{
            ejecuteQuery(con,"DELETE FROM scansApi WHERE dbId = " + scanId)
            .then(()=>{con.end();})
            .catch(()=>{con.end();});
        })
        .catch();
    },    

    existRelation:function(resScanId,vulnerabilityId){
        return new Promise((resolve,reject)=>{
            let query = "SELECT scanId FROM scansVulnerabilities WHERE ";
            let condition = "scanId = " + resScanId + " AND vulnerabilityID = " + vulnerabilityId;// vulnerabilityId; 

            conectionDB()
            .then(con=>{
               con.query(query+condition,function(err,result){
                    con.end();
                    if(!err){
                        if(result.length>0)
                            resolve(true)
                        else
                            resolve(false)
                    }
                    else
                        reject(err)
               });
            })
            .catch(err=>{
                reject(err);
            })

        });
    }
    
}

function ejecuteSelectMax(id,table){

    return new Promise((resolve,reject)=>{

        conectionDB()
        .then((con)=>{
            con.query("SELECT MAX(" + id +") FROM " + table ,function(err,result){
                con.end();
                var newId = 1;
                if(!err){
                    if( result != null){
                        var val = JSON.stringify(result);
                        var json =  JSON.parse(val);
                    
                        newId = json[0]["MAX("+ id +")"] + 1;
                    }
                    resolve(newId);
                }else
                    reject(err);
                    
            })
        })
        .catch(err=>{
            reject(err);
        })
    })

}


function conectionDB(){
    return new Promise((resolve,reject)=>{
        var con = mysql.createConnection({
            host: HOST,
            port: PORT,
            user: USER,
            password: PASSWORD,
            database: DATABASE
        });
        con.connect(function(error){
            try {

                if(error){
                    reject("error con la conexión");
                }
                else
                resolve(con);
                
            } catch (error) {
                reject(error);
            }
        });
    });
}


function existVulnerability(vulnerability,con){
    return new Promise((resolve,reject)=>{
        
        var query = "SELECT vulnerabilityId FROM vulnerabilities WHERE description LIKE \""  + vulnerability + "\"";
        
        con.query(query ,function(err,result){

            if(!err){
                
                if( result.length > 0){
                    
                    var val = JSON.stringify(result);
                    var json =  JSON.parse(val);
                        
                   resolve(json[0].vulnerabilityId);
                    
                }
                else
                    resolve(false);
            }
            else
                reject(err);
                    
        })
        

    })
    
}



function insertVulnetability(vulnerability,con){ 

    return new Promise((resolve,reject)=>{          
        existVulnerability(vulnerability,con)
        .then(res=>{
            
            if(!res){
                con.query("INSERT INTO vulnerabilities (description) VALUES ( \"" + vulnerability + "\")", 
                function(err, result){
                    if(!err)
                       resolve(result.insertId);
                    else
                        reject(err);
                });
            }
            else
                resolve(res);
        })
        .catch(err=>{
            reject(err);
        })
    });
        

}


function buildInsertRelation(scanId, idVulnerabilities){
    var query = "INSERT INTO scansVulnerabilities VALUES ";

    idVulnerabilities.forEach(item=>{
        query = query + "( " + scanId + ", " + item + " ) ,";
    });

    return query.substring(0,query.length-1) //Elimina la última coma antes de retornar
}

function buildQuerySelectVulnerabilityDescription(jsonVulnerabilities){
    var query = "SELECT description FROM vulnerabilities WHERE ";
    var valuesWhere ="";
    jsonVulnerabilities.forEach(item=>{
        valuesWhere = valuesWhere + "( vulnerabilityId = " + item.vulnerabilityId + ") OR ";
    });

   valuesWhere = valuesWhere.substring(0,valuesWhere.length - 4) //borra el último OR junto a sus espacios

    return query + valuesWhere;
}



function buildInsertScansApiQuery(scanDB,scanApi){
    return "INSERT INTO scansApi VALUES ( " + scanDB + ", " + scanApi + ")";
}

function ejecuteQuery(con, query){
    return new Promise((resolve,reject)=>{
        con.query(query,(err,result)=>{
            if(err)
                reject(err);
            else if(result)
                resolve(result);
        });
    });
}