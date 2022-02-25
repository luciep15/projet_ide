const express = require('express');
const app = express();
const fs = require('fs');
const mysql = require('promise-mysql');

//on va pouvoir stocker nos images que l'on télécharge du front dans un dossier static qui se situe dans le dossier public
const fileUpload = require('express-fileupload');
app.use(fileUpload({
    createParentPath: true
}));

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

//nous évite que le navigateur bloque nos requêtes ajax
const cors = require('cors');
app.use(cors());

app.use(express.static(__dirname + '/public'));

mysql.createConnection({
	host: "db.3wa.io",
	database: "luciepecot_annonces",
	user: "luciepecot",
	password: "998da593aacf5e10bd0e436155ce6d3b"
	//port: 8889 
/*	host: "db.3wa.io",
	database: "monesma_annonces",
	user: "monesma",
	password: "c0b7990cb05833d15b0d5001963aa61a"*/
}).then((db) => {
	console.log('connecté bdd');
	setInterval(async function () {
		let res = await db.query('SELECT 1');
	}, 10000);
	
	app.get("/", (req,res,next)=>{
	    res.json({status: 200, msg: "Welcome to your annonces API bro!"})
	})
		//route pour afficher toutes les annonces
	app.get('/api/v1/ads', async (req, res, next)=>{
	    
	    let adsBDD = await db.query('SELECT * FROM ads');
	    
	    if(adsBDD.code){
	        res.json({status:500, error_msg: adsBDD})
	    }
	    
	    res.json({status: 200, results:{msg: "Success", ads: adsBDD}})
	})
	
	//route de récupération d'un article par son id
	app.get('/api/v1/ads/:id', async (req, res, next)=>{
		let id = req.params.id;
		let adBDD = await db.query('SELECT * FROM ads WHERE Id = ?', [id])
	
		if(adBDD.code) {
			let error = {
				status: 500,
				error_msg: adBDD
			}
			res.json(error);
		}
		if(adBDD.length === 0) {
			let error = {
				status: 404,
				error_msg: "Not Found"
			}
			res.json(error);
		}
		
		let response = {
			status: 200,
			results: {
				ad: adBDD[0]
			}
		}
		res.json(response);
	})
	
	
	//route pour sauvegarder un article dans la bdd
	app.post('/api/v1/ads/save', (req, res, next)=>{
	    db.query('INSERT INTO ads (Title, Contents, CreationTimestamp, Url) VALUES (?, ?, NOW(), ?)', [req.body.title, req.body.contents, req.body.url ])
		.then((result, err)=>{
		    if(err){
		        res.json({status: 500, msg: "pb ajout", error: err})
		    }
		    res.json({status: 200, result: "success"})
		    
		})
		.catch(err=>console.log("Error ajout:", err))
	})
	
	//route pour enregistrer une image vers notre dossier static
	app.post('/api/v1/ads/pict', (req, res, next)=>{
		console.log(req.files.image);
		//si on a pas envoyé de req.files via le front ou que cet objet ne possède aucune propriété
		if (!req.files || Object.keys(req.files).length === 0) {
			//on envoi une réponse d'erreur
	    	 res.json({status: 400, msg: "La photo n'a pas pu être récupérée"});
	    }
	    
	    //la fonction mv va envoyer l'image dans le dossier que l'on souhaite.
	    req.files.image.mv('public/images/'+req.files.image.name, function(err) {
	    	console.log('ça passe', '/public/images/'+req.files.image.name)
	    	//si ça plante dans la callback
		    if (err) {
		    //renvoi d'un message d'erreur
		      res.json({status: 500, msg: "La photo n'a pas pu être enregistrée"})
		    }
	    	
	    })
		//on doit renvoyer le nom de l'image dans la reponse vers le front car il en aura besoin pour pouvoir enregistrer le nom de l'image dans la bdd lors de la sauvegarde de l'annonce
		res.json({status: 200, msg: 'ok', url: req.files.image.name});
	})
	//du coup dans mon front je pourrais chopper l'image avec l'url "http://fsjs10.ide.3wa.io:9500/images/" + name
	
	
	//route de modification
	app.put('/api/v1/ads/update/:id', (req, res, next)=>{
		let id = req.params.id;
		db.query('UPDATE ads SET Title=?, Contents=? WHERE Id = ?', [req.body.title, req.body.contents, id])
		.then((result, err)=>{
			if(err){
				res.json({status: 500, err: err})
			}
			res.json({status: 200, msg: "succes to update ads : "+id})
		})
	})
	
	
	//route de suppression
	app.delete('/api/v1/ads/delete/:id', (req, res, next)=>{
		let id = req.params.id;
		//je récup les infos de l'article pour avoir le nom de l'img à supprimer
		db.query('SELECT * FROM ads WHERE Id = ?', [id])
		.then((result, err)=>{
			//je stock le nom de l'img dans une variable
			let nameImg = result[0].Url
			//je demande à supprimer mon annonce
			db.query('DELETE FROM ads WHERE Id = ?', [id])
			.then((result, err)=>{
				if(err) {
					res.json({status: 500, err: err})
				}
				//si le nom de l'image n'est pas l'image par défaut no-pict
				if(nameImg !== "no-pict.jpg"){
					//je supprime l'image avec la fonction unlink du module fs natif de node
					fs.unlink('public/images/'+ nameImg, (err)=>{
						if(err){
							res.json({status:500, msg: "big pb image non supp", error: err})
						}
						console.log("supprimé")
					})
				}
				res.json({status: 200, msg: "delete success id: "+id})
				
			})
		})
		.catch(err=>console.log(err))
		
	})
	
})
.catch(err=>console.log("Erreur Connection: ", err))

const PORT = process.env.PORT || 9500;
app.listen(PORT, ()=>{
	console.log('listening port '+PORT+' all is ok');
})