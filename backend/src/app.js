const express=require("express")
const documentRoutes = require('./routes/document.routes');
const queryRoutes = require('./routes/query.routes');

const app=express()

app.use(express.json());

app.use('/documents', documentRoutes);
app.use('/query', queryRoutes);

module.exports=app