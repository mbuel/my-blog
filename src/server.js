import express from 'express';
import bodyParser from 'body-parser';
import {MongoClient} from 'mongodb';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, '/build/')))
app.use(bodyParser.json());

const withDB = async (operations, res) => {
    try {
        console.log('creating client');
        const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser:true, useUnifiedTopology:true });

        console.log('creating db object');
        const db = client.db('my-blog');

        console.log('running callback for operations.')
        await operations(db);
    
        client.close();
    } catch (error){
        console.log('error connecting to database')
        res.status(500).json({message: 'Error connecting to db', error});
    }
}

app.get('/api/articles/:name', async (req, res) => {
    withDB(async (db) => {
        const articleName = req.params.name;

        const articlesInfo = await db.collection('articles').findOne({name:articleName});
    
        res.status(200).json(articlesInfo);
    }, res);

});

app.post('/api/articles/:name/upvote', async (req, res) => {
    
    withDB(async (db) => {
        const articleName = req.params.name;
        console.log(`voting up: ${articleName}`);

        const articleInfo = await db.collection('articles').findOne({name:articleName});

        await db.collection('articles').updateOne({name: articleName}, {
            '$set' : {
                upvotes : articleInfo.upvotes + 1,
            }
        });

        const updatedArticleInfo = await db.collection('articles').findOne({name:articleName});

        res.status(200).json(updatedArticleInfo);
    }, res);

});

app.post('/api/articles/:name/add-comment', (req, res) => {
    const { username, text } = req.body;
    const articleName = req.params.name;

    console.log(`adding comment to: ${articleName}`);
    withDB(async (db) => {
        const articleInfo = await db.collection('articles').findOne({name:articleName});

        console.log('updating collection', articleInfo, username, text);

        await db.collection('articles').updateOne({name: articleName}, {
            '$set' : {
                comments : articleInfo.comments.concat({username, text})
            }
        });

        console.log('finding updated articleName');
        const updatedArticleInfo = await db.collection('articles').findOne({name:articleName});

        res.status(200).json(updatedArticleInfo);

    }, res);

});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'));
})

app.listen(9000, () => console.log('Listening on port 9000'));