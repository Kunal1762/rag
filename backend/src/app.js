const express=require("express")

const app=express()

app.use(express.json());

app.use('/documents', documentRoutes);
app.use('/query', queryRoutes);

module.exports=app