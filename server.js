//시작 전 세팅
const express = require("express");
const MongoClient = require("mongodb").MongoClient;
//데이터베이스의 데이터 입력, 출력을 위한 함수명령어 불러들이는 작업
const moment = require("moment");
const app = express();
const port = 8080;

//ejs 태그를 사용하기 위한 세팅
app.set("view engine","ejs");
//사용자가 입력한 데이터값을 주소로 통해서 전달되는 것을 변환(parsing)
app.use(express.urlencoded({extended: true}));
//css/img/js(정적인 파일)사용하려면 이 코드를 작성!
app.use(express.static('html'));

//데이터베이스 연결작업
let db; //데이터베이스 연결을 위한 변수세팅(변수의 이름은 자유롭게 지어도 됨)
MongoClient.connect("mongodb+srv://admin:qwer1234@testdb.qmmqvc3.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err){ return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("testdb");

    //db연결이 제대로 되었다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });
});


//메인페이지로 이동
app.get("/",function(req,res){
    res.render("index");
});

//문의게시판으로 이동
app.get("/qna",function(req,res){
    res.render("qna_insert");
});


//데이터베이스에 데이터 삽입
//문의하기 페이지의 form태그에서 입력한 값을 가져옴
app.post("/qnaAdd",function(req,res){
    //작성하고 올린 시간을 나타내기 위한 기능
    let date = moment().format('YYYY-MM-DD HH:mm');

    db.collection("qna_count").findOne({name:"문의하기갯수"},function(err,result){
        //db에 있는 콜렉션 qna_board에 데이터를 넣어준다.
        db.collection("qna_board").insertOne({
            //콜렉션의 프로퍼티 이름을 쓰고 값에는 form태그를 토대로 쓴다.
            qna_id: result.totalCount + 1,
            qna_author: req.body.author,
            qna_title: req.body.title,
            qna_context: req.body.context,
            qna_date: date,
            qna_review: 0
        },function(err,result){
            /* qna_board콜렉션에는 totalCount숫자를 증가시켜줬지만 
               qna_count콜렉션에는 증가시켜주지 않았으므로 updateOne()함수를 이용하여 증가시켜줌 */
            //update({무엇을 바꿔줄지 찾기},{바꿔줄 내용[$set/$inc]},function(err,result){});
           db.collection("qna_count").updateOne({name:"문의하기갯수"},{$inc:{totalCount:1}},function(err,result){
                res.redirect("/list");
           });
        });
    });
});


//목록페이지로 이동
app.get("/list",function(req,res){
    // db.collection("qna_count").findOne({name:"문의하기갯수"},function(err,result){
        //컬렉션 qna_board에 있는 데이터들 모두 찾아서 배열상태로 가져오기
        db.collection("qna_board").find().toArray(function(err,result){
            //위에서 찾은 데이터들을 해당 ejs파일에 보여줌
            res.render("qna_list",{data:result});
        });
    // });
});


//상세페이지로 이동
//상세페이지는 id에 따라 하나만 보여줌
app.get("/detail/:id",function(req,res){
    db.collection("qna_board").updateOne({qna_id: Number(req.params.id)},{$inc:{qna_review:1}},function(err,result){
        db.collection("qna_board").findOne({qna_id: Number(req.params.id)},function(err,result){
            res.render("qna_detail",{data:result});
        });
    });
});


//게시글 삭제기능
app.get("/delete/:id",function(req,res){
    //qna_board컬렉션에서 해당 id를 찾아 삭제하면 목록페이지로 강제이동
    db.collection("qna_board").deleteOne({qna_id: Number(req.params.id)},function(err,result){
        res.redirect("/list");
    });
});


app.get("/uptview/:id",function(req,res){
    //qna_borad 에서 해당 게시글 번호에 맞는 데이터들만 갖고와서
    db.collection("qna_board").findOne({qna_id: Number(req.params.id)},function(err,result){
        //qna_update.ejs파일로 render 데이터와 함께 넘겨줌
        res.render("qna_update",{data:result});
    });
});


//게시글 수정기능
//update.ejs에서 새로 값을 받아와서 그 값을 db에 재저장
app.post("/update",function(req,res){
    db.collection("qna_board").updateOne({qna_id: Number(req.body.id)},{$set:{
        qna_title: req.body.title,
        qna_context: req.body.context,
        qna_author: req.body.author
    }},function(err,result){
        res.redirect("/detail/" + req.body.id);
    });
});


//게시글 검색기능
app.get("/searchAdd",function(req,res){
    //mongodb에서 지원하는 search index에서 가져온 배열객체를 변수에 담아준다.
    let search_data = [
        {
          $search: {
            //mongodb에서 search index 만들 때 내가 지어준 이름
            index: 'qna_search',
            text: {
              //서치인풋에서 쓴 값을 가져옴 - 이때 query로
              //option의 value값은 db에 저장된 이름으로 써야함
              query: req.query.search,
              //경로
              path: req.query.ser_select
            }
          }
        }
      ];

    db.collection("qna_board").aggregate(search_data).toArray(function(err,result){
        res.render("qna_list",{data:result});
    });

});