1.	Realizar un Build del archivo Docker-compose que se encuentra dentro de la carpeta DAST con el siguiente comando: docker-compose up –build -d
2.	Entrar a la DB mysql mini-dast desde docker con Host: nombre_del_contenedor Usuario: user  Password: password y correr el script tablasDast.sql, para la creación de las tablas necesarias.
3.	Una vez el ambiente esté levantado y las tablas creadas, entrar a las vistas:
	3.1	http://localhost:8080 Es la vista por default.
	3.2	http://localhost:8080/scan POST: Corriendolo desde PostMan se pude realizar el post con el request {“url”:”http://pagina.com”}
	3.3	http://localhost:8080/spiderings/:spidering_id 		GET
	3.4	http://localhost:8080/spiderings/:spidering_id/result 	GET
