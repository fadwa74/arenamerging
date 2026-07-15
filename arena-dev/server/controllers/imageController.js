import db from "../config/db.js";


const buildImageModelString = (model) => {

    if(model.model_id && model.model_id.trim() !== ""){

        return `image/generation/${model.provider}/${model.model_id}`;

    }

    return `image/generation/${model.provider}`;

};




async function startImageJob(prompt, model) {


    const modelString = buildImageModelString(model);


    console.log("🌐 Calling Eden AI:", modelString);



    const response = await fetch(
        "https://api.edenai.run/v3/universal-ai",
        {

            method:"POST",

            headers:{
                Authorization:`Bearer ${process.env.EDEN_API_KEY}`,
                "Content-Type":"application/json"
            },


            body:JSON.stringify({

                model:modelString,

                input:{

                    text:prompt,

                    resolution:"1024x1024"

                }

            })

        }
    );



    const data = await response.json();



    console.log(
        "EDEN RESPONSE:",
        JSON.stringify(data,null,2)
    );



    if(data.detail){

        throw new Error(
            data.detail.message
        );

    }



    if(!response.ok){

        throw new Error(
            "Eden image generation failed"
        );

    }

const url =
    data?.image_resource_url ||
    data?.output?.image_resource_url ||
    data?.output?.items?.[0]?.image_resource_url ||
    data?.output?.items?.[0]?.url ||
    data?.items?.[0]?.image_resource_url ||
    data?.items?.[0]?.url;

console.log(
    "DEBUG URL SEARCH:",
    {
        direct:data?.image_resource_url,
        output:data?.output,
        items:data?.items,
        result:data?.result
    }
);
    if(!url){

        throw new Error(
            "No image URL returned from Eden"
        );

    }



    return url;

}








export async function generate(req,res){


try{


const {prompt}=req.body;



if(!prompt){

return res.status(400).json({

success:false,

error:"Missing prompt"

});

}




console.log(
"📸 Image Battle:",
prompt
);






// IMPORTANT
// choose only working image models
const models = db.prepare(
`
SELECT *
FROM models
WHERE type='image'
ORDER BY RANDOM()
LIMIT 2
`
).all();






if(models.length < 2){

return res.status(400).json({

success:false,

error:"Need two image models"

});

}




const modelA=models[0];

const modelB=models[1];




console.log(
"⚔️",
modelA.name,
"VS",
modelB.name
);







const promptId = Number(

db.prepare(
`
INSERT INTO prompts(text)
VALUES(?)
`
)
.run(prompt)
.lastInsertRowid

);







const [
resultA,
resultB

]=await Promise.allSettled([


startImageJob(prompt,modelA),


startImageJob(prompt,modelB)


]);







const outputA =

resultA.status==="fulfilled"

?

{

success:true,

url:resultA.value

}

:

{

success:false,

error:resultA.reason.message

};







const outputB =

resultB.status==="fulfilled"

?

{

success:true,

url:resultB.value

}

:

{

success:false,

error:resultB.reason.message

};








console.log(
"IMAGE A:",
outputA
);


console.log(
"IMAGE B:",
outputB
);









const battle=db.prepare(

`
INSERT INTO battles
(
prompt_id,
model_a_id,
model_b_id,
output_a,
output_b
)

VALUES(?,?,?,?,?)

`

).run(


promptId,


modelA.id,


modelB.id,


outputA.success ? outputA.url:null,


outputB.success ? outputB.url:null


);









return res.json({

success:true,


battle_id:battle.lastInsertRowid,


model_a_name:modelA.name,


model_b_name:modelB.name,


elo_a:modelA.elo_rating,


elo_b:modelB.elo_rating,


// frontend friendly

image_a_url: outputA.url || null,

image_b_url: outputB.url || null,


output_a:outputA,


output_b:outputB


});






}

catch(err){


console.error(
"Image generation error:",
err
);



return res.status(500).json({

success:false,

error:err.message

});


}



}