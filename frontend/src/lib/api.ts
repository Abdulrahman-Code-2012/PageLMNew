import { env } from "../config/env";

/* =========================
   TYPES
========================= */

export type ChatStartResponse = {
  ok: true;
  chatId: string;
  stream: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  at: number;
};

export type ChatInfo = {
  id: string;
  title?: string;
  createdAt?: number;
};

export type ChatsList = {
  ok: true;
  chats: ChatInfo[];
};

export type ChatDetail = {
  ok: true;
  chat: ChatInfo;
  messages: ChatMessage[];
};

export type ChatJSONBody = {
  q: string;
  chatId?: string;
};

export type ChatPhase =
  | "upload_start"
  | "upload_done"
  | "generating";

export type FlashCard = {
  q: string;
  a: string;
  tags?: string[];
};

export type AnswerPayload =
  | string
  | {
      answer: string;
      flashcards?: FlashCard[];
    };

export type ChatEvent =
  | {
      type: "ready";
      chatId: string;
    }
  | {
      type: "phase";
      value: ChatPhase;
    }
  | {
      type: "file";
      filename: string;
      mime: string;
    }
  | {
      type: "answer";
      answer: AnswerPayload;
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      error: string;
    };


/* =========================
   HELPERS
========================= */

type PromiseType<T> = Promise<T>;

const timeoutCtl = (ms:number)=>{
  const controller = new AbortController();

  const timer = setTimeout(
    ()=>controller.abort(),
    ms
  );

  return {
    signal: controller.signal,
    done:()=>{
      clearTimeout(timer);
    }
  };
};


async function req<T = unknown>(
  url:string,
  init:RequestInit & {
    timeout?:number
  } = {}
):PromiseType<T>{

  const {
    timeout = env.timeout,
    ...rest
  } = init;


  const {
    signal,
    done
  } = timeoutCtl(timeout);


  try{

    const response = await fetch(
      url,
      {
        signal,
        ...rest
      }
    );


    if(!response.ok){

      const text =
        await response
        .text()
        .catch(()=>"")


      throw new Error(
        `HTTP ${response.status}: ${
          text || response.statusText
        }`
      );
    }


    const contentType =
      response.headers
      .get("content-type") || "";


    if(
      contentType.includes(
        "application/json"
      )
    ){
      return await response.json() as T;
    }


    return await response.text() as unknown as T;


  }finally{

    done();

  }
}


const jsonHeaders = ()=>{

  const headers = new Headers();

  headers.set(
    "content-type",
    "application/json"
  );

  return headers;

};



function wsURL(path:string){

  const url =
    new URL(env.backend);


  const protocol =
    url.protocol === "https:"
      ? "wss:"
      : "ws:";


  return `${protocol}//${url.host}${path}`;

}


/* =========================
   CHAT
========================= */


export async function chatJSON(
  body:ChatJSONBody
){

  return req<ChatStartResponse>(
    `${env.backend}/chat`,
    {
      method:"POST",
      headers:jsonHeaders(),
      body:JSON.stringify(body)
    }
  );

}



export async function chatMultipart(
  q:string,
  files:File[],
  chatId?:string
){

  const form =
    new FormData();


  form.append(
    "q",
    q
  );


  if(chatId){

    form.append(
      "chatId",
      chatId
    );

  }


  for(const file of files){

    form.append(
      "file",
      file,
      file.name
    );

  }


  return req<ChatStartResponse>(
    `${env.backend}/chat`,
    {
      method:"POST",
      body:form,
      timeout:300000
    }
  );

}



export function connectChatStream(
  chatId:string,
  onEvent:(event:ChatEvent)=>void
){

  const url =
    wsURL(
      `/ws/chat?chatId=${encodeURIComponent(chatId)}`
    );


  const ws =
    new WebSocket(url);



  ws.onmessage = (message)=>{

    try{

      const data =
        JSON.parse(
          message.data as string
        ) as ChatEvent;


      onEvent(data);


    }catch{

    }

  };


  ws.onerror = ()=>{

    onEvent({
      type:"error",
      error:"stream_error"
    });

  };


  return {

    ws,

    close(){

      try{
        ws.close();
      }catch{}

    }

  };

}



export async function chatAskOnce(
  opts:{
    q:string;
    files?:File[];
    chatId?:string;
    onEvent?:
      (event:ChatEvent)=>void;
  }
){

  const {
    q,
    files=[],
    chatId,
    onEvent
  } = opts;


  const start =
    files.length
      ? await chatMultipart(
          q,
          files,
          chatId
        )
      : await chatJSON({
          q,
          chatId
        });


  let answer = "";


  let flashcards:
    FlashCard[] | undefined;



  await new Promise<void>(
    (resolve,reject)=>{


      const stream =
        connectChatStream(
          start.chatId,
          event=>{


            onEvent?.(event);



            if(
              event.type==="answer"
            ){

              if(
                typeof event.answer==="string"
              ){

                answer =
                  event.answer;

              }else{

                answer =
                  event.answer.answer || "";


                flashcards =
                  event.answer.flashcards;

              }

            }



            if(
              event.type==="done"
            ){

              stream.close();

              resolve();

            }



            if(
              event.type==="error"
            ){

              stream.close();

              reject(
                new Error(
                  event.error
                )
              );

            }


          }
        );


    }
  );



  return {
    chatId:start.chatId,
    answer,
    flashcards
  };

}
 
/* =========================
   COMPANION
========================= */

export type CompanionHistoryEntry = {
  role:"user" | "assistant";
  content:string;
};


export type CompanionAnswer = {
  topic:string;
  answer:string;
  flashcards:FlashCard[];
};


export type CompanionAskResponse = {
  ok:boolean;
  companion:CompanionAnswer;
};



export async function companionAsk(
  input:{
    question:string;
    filePath?:string;
    documentText?:string;
    documentTitle?:string;
    topic?:string;
    history?:CompanionHistoryEntry[];
  }
){

  const payload:any = {
    question:
      input.question.trim()
  };


  if(input.filePath)
    payload.filePath=input.filePath;


  if(input.documentText)
    payload.documentText=input.documentText;


  if(input.documentTitle)
    payload.documentTitle=input.documentTitle;


  if(input.topic)
    payload.topic=input.topic;


  if(input.history)
    payload.history=input.history;



  return req<CompanionAskResponse>(
    `${env.backend}/api/companion/ask`,
    {
      method:"POST",
      headers:jsonHeaders(),
      body:JSON.stringify(payload),
      timeout:120000
    }
  );

}



/* =========================
   CHATS
========================= */


export function getChats(){

  return req<ChatsList>(
    `${env.backend}/chats`,
    {
      method:"GET"
    }
  );

}



export function getChatDetail(
  id:string
){

  return req<ChatDetail>(
    `${env.backend}/chats/${encodeURIComponent(id)}`,
    {
      method:"GET"
    }
  );

}



/* =========================
   FLASHCARDS
========================= */


export type SavedFlashcard = {

  id:string;

  question:string;

  answer:string;

  tag:string;

  created:number;

};



export async function createFlashcard(
  input:{
    question:string;
    answer:string;
    tag:string;
  }
){

  return req<{
    ok:true;
    flashcard:SavedFlashcard;
  }>(
    `${env.backend}/flashcards`,
    {
      method:"POST",
      headers:jsonHeaders(),
      body:JSON.stringify(input)
    }
  );

}



export function listFlashcards(){

  return req<{
    ok:true;
    flashcards:SavedFlashcard[];
  }>(
    `${env.backend}/flashcards`,
    {
      method:"GET"
    }
  );

}



export function deleteFlashcard(
  id:string
){

  return req<{
    ok:true;
  }>(
    `${env.backend}/flashcards/${encodeURIComponent(id)}`,
    {
      method:"DELETE"
    }
  );

}



/* =========================
   EXAMS
========================= */


export type Question = {

  id:number;

  question:string;

  options:string[];

  correct:number;

  hint:string;

  explanation:string;

  imageHtml?:string;

};



export type ExamEvent =

 | {
    type:"ready";
    runId:string;
   }

 | {
    type:"phase";
    value:string;
    examId?:string;
   }

 | {
    type:"exam";
    examId:string;
    payload:Question[];
   }

 | {
    type:"done";
   }

 | {
    type:"error";
    error:string;
   };




export async function getExams(){

  return req<{
    ok:true;
    exams:any[];
  }>(
    `${env.backend}/exams`,
    {
      method:"GET"
    }
  );

}



export async function startExam(
  examId:string
){

 return req<{
    ok:true;
    runId:string;
    stream:string;
 }>(
    `${env.backend}/exam`,
    {
      method:"POST",
      headers:jsonHeaders(),
      body:JSON.stringify({
        examId
      })
    }
 );

}



export function connectExamStream(
 runId:string,
 onEvent:(event:ExamEvent)=>void
){

 const ws =
   new WebSocket(
     wsURL(
       `/ws/exams?runId=${encodeURIComponent(runId)}`
     )
   );


 ws.onmessage=(m)=>{

  try{

   onEvent(
    JSON.parse(
      m.data as string
    )
   );

  }catch{}

 };


 ws.onerror=()=>{

  onEvent({
    type:"error",
    error:"stream_error"
  });

 };


 return {

  ws,

  close(){

   try{
    ws.close();
   }catch{}

  }

 };

}



/* =========================
   SMART NOTES
========================= */


export type SmartNotesEvent =

 | {
    type:"ready";
    noteId:string;
   }

 | {
    type:"phase";
    value:string;
   }

 | {
    type:"file";
    file:string;
   }

 | {
    type:"done";
   }

 | {
    type:"error";
    error:string;
   };



export function smartnotesStart(
 input:{
  topic?:string;
  notes?:string;
  filePath?:string;
 }
){

 return req(
   `${env.backend}/smartnotes`,
   {
    method:"POST",
    headers:jsonHeaders(),
    body:JSON.stringify(input)
   }
 );

}



export function connectSmartnotesStream(
 noteId:string,
 onEvent:(event:SmartNotesEvent)=>void
){

 const ws =
 new WebSocket(
   wsURL(
    `/ws/smartnotes?noteId=${encodeURIComponent(noteId)}`
   )
 );


 ws.onmessage=(m)=>{

  try{

   onEvent(
    JSON.parse(
     m.data as string
    )
   );

  }catch{}

 };


 return {

  ws,

  close(){

   try{
    ws.close();
   }catch{}

  }

 };

}



/* =========================
   PODCAST
========================= */


export function podcastStart(
 payload:{
  topic:string
 }
){

 return req(
  `${env.backend}/podcast`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify(payload)
  }
 );

}



export function connectPodcastStream(
 pid:string,
 onEvent:(event:any)=>void
){

 const ws =
 new WebSocket(
  wsURL(
   `/ws/podcast?pid=${encodeURIComponent(pid)}`
  )
 );


 ws.onmessage=(e)=>{

  try{

   onEvent(
    JSON.parse(e.data)
   );

  }catch{}

 };


 ws.onerror=()=>{

  onEvent({
   type:"error",
   error:"stream_error"
  });

 };


 return {

  ws,

  close(){

   try{
    ws.close();
   }catch{}

  }

 };

}



/* =========================
   TRANSCRIBER
========================= */


export type TranscriptionResponse = {

 ok:boolean;

 transcription?:string;

 provider?:string;

 confidence?:number;

 error?:string;

 studyMaterials?:unknown;

};



export function transcribeAudio(
 file:File
){

 const form =
 new FormData();


 form.append(
  "file",
  file
 );


 return req<TranscriptionResponse>(
  `${env.backend}/transcriber`,
  {
   method:"POST",
   body:form,
   timeout:180000
  }
 );

}
 
/* =========================
   PLANNER
========================= */


export type PlannerTask = {

 id:string;

 course?:string;

 title:string;

 type?:string;

 notes?:string;

 dueAt:number;

 estMins:number;

 priority:1|2|3|4|5;

 status:
  |"todo"
  |"doing"
  |"done"
  |"blocked";

 createdAt:number;

 updatedAt:number;

 tags?:string[];

 files?:any[];

 steps?:string[];

};



export type PlannerSlot = {

 id:string;

 taskId:string;

 start:number;

 end:number;

 kind:
  |"focus"
  |"review"
  |"buffer";

 done?:boolean;

};



export type WeeklyPlan = {

 days:{
  date:string;
  slots:PlannerSlot[];
 }[];

};



export type PlannerEvent = any;



export function plannerIngest(
 text:string
){

 return req(
  `${env.backend}/tasks/ingest`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify({
    text
   })
  }
 );

}



export function plannerList(
 params?:{
  status?:string;
  dueBefore?:number;
  course?:string;
 }
){

 const q =
 new URLSearchParams();


 if(params?.status)
  q.set(
   "status",
   params.status
  );


 if(params?.dueBefore)
  q.set(
   "dueBefore",
   String(params.dueBefore)
  );


 if(params?.course)
  q.set(
   "course",
   params.course
  );


 return req(
  `${env.backend}/tasks${
   q.toString()
    ? `?${q}`
    :""
  }`,
  {
   method:"GET"
  }
 );

}



export function plannerPlan(
 id:string,
 cram=false
){

 return req(
  `${env.backend}/tasks/${encodeURIComponent(id)}/plan`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify({
    cram
   })
  }
 );

}



export function plannerWeekly(
 cram=false
){

 return req(
  `${env.backend}/planner/weekly`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify({
    cram
   })
  }
 );

}



export function plannerMaterials(
 id:string,
 kind:
  |"summary"
  |"studyGuide"
  |"flashcards"
  |"quiz"
){

 return req(
  `${env.backend}/tasks/${encodeURIComponent(id)}/materials`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify({
    kind
   })
  }
 );

}



export function connectPlannerStream(
 sid:string,
 onEvent:(event:PlannerEvent)=>void
){

 const ws =
 new WebSocket(
  wsURL(
   `/ws/planner?sid=${encodeURIComponent(sid)}`
  )
 );


 ws.onmessage=(m)=>{

  try{

   onEvent(
    JSON.parse(
     m.data as string
    )
   );

  }catch{}

 };


 return {

  ws,

  close(){

   try{
    ws.close();
   }catch{}

  }

 };

}



export function plannerUpdate(
 id:string,
 patch:Partial<PlannerTask>
){

 return req(
  `${env.backend}/tasks/${encodeURIComponent(id)}`,
  {
   method:"PATCH",
   headers:jsonHeaders(),
   body:JSON.stringify(patch)
  }
 );

}



export function plannerDelete(
 id:string
){

 return req(
  `${env.backend}/tasks/${encodeURIComponent(id)}`,
  {
   method:"DELETE"
  }
 );

}



/* =========================
   DEBATE
========================= */


export type DebateStartResponse = {

 ok:boolean;

 debateId:string;

 session:any;

 stream:string;

 error?:string;

};



export type DebateSession = {

 id:string;

 topic:string;

 position:
  |"for"
  |"against";

 messages:any[];

 createdAt:number;

};



export function startDebate(
 topic:string,
 position:"for"|"against"
){

 return req<DebateStartResponse>(
  `${env.backend}/debate/start`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify({
    topic,
    position
   }),
   timeout:30000
  }
 );

}



export function submitDebateArgument(
 debateId:string,
 argument:string
){

 return req(
  `${env.backend}/debate/${encodeURIComponent(debateId)}/argue`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify({
    argument
   }),
   timeout:120000
  }
 );

}



export function getDebateSession(
 debateId:string
){

 return req(
  `${env.backend}/debate/${encodeURIComponent(debateId)}`,
  {
   method:"GET"
  }
 );

}



export function listDebates(){

 return req(
  `${env.backend}/debates`,
  {
   method:"GET"
  }
 );

}



export function deleteDebate(
 debateId:string
){

 return req(
  `${env.backend}/debate/${encodeURIComponent(debateId)}`,
  {
   method:"DELETE"
  }
 );

}



export function surrenderDebate(
 debateId:string
){

 return req(
  `${env.backend}/debate/${encodeURIComponent(debateId)}/surrender`,
  {
   method:"POST",
   headers:jsonHeaders()
  }
 );

}



export function analyzeDebate(
 debateId:string
){

 return req(
  `${env.backend}/debate/${encodeURIComponent(debateId)}/analyze`,
  {
   method:"POST",
   headers:jsonHeaders(),
   timeout:60000
  }
 );

}



/* =========================
   QUIZ
========================= */


export type QuizEvent = any;



export function quizStart(
 topic:string
){

 return req(
  `${env.backend}/quiz`,
  {
   method:"POST",
   headers:jsonHeaders(),
   body:JSON.stringify({
    topic
   })
  }
 );

}



export function connectQuizStream(
 quizId:string,
 onEvent:(event:QuizEvent)=>void
){

 const ws =
 new WebSocket(
  wsURL(
   `/ws/quiz?quizId=${encodeURIComponent(quizId)}`
  )
 );


 ws.onmessage=(m)=>{

  try{

   onEvent(
    JSON.parse(
     m.data as string
    )
   );

  }catch{}

 };


 return {

  ws,

  close(){

   try{
    ws.close();
   }catch{}

  }

 };

}



/* =========================
   ERROR HELPER
========================= */


export function err(
 e:unknown
){

 return e instanceof Error
  ? e.message
  : String(e);

}
