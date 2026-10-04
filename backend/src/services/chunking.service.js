const {RecursiveCharacterTextSplitter}=require("@langchain/textsplitters")

async function chunkText(text, chunkSize=1000, chunkOverlap=100){
    const splitter=new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        separators:['\n\n', '\n', '. ', ' ', '']
    });
    const chunks=await splitter.splitText(text.trim());
    return chunks;
}

module.exports={
    chunkText
}