var Data = {
  selected: null,
  answers_total: 0,
  score: 0,
  current_question: function(){
    var question = null;
    for (var i = 0; i < Data.questions.list.length; i++){
      if (Data.question_index === Data.questions.list[i].uuid){
        question = Data.questions.list[i]
        break;
      }
    }
    return question;
  },
  question_index: null,
  applyProgress: function(data){
    Data.score = parseInt(data.score, 10)
    Data.answers_total = parseInt(data.answers_total, 10)
    Data.question_index = data.question_index
    Data.selected = null
  },
  questions: {
    list: [],
    fetch:  function(){
      m.request({
        method: "GET",
        url: "/questions"
      })
      .then(function(data) {
        Data.applyProgress(data)
        Data.questions.list = data.questions
      })
    }
  }
}

var Choice = {
  click: function(n){
    return function(){
      Data.selected = n
    }
  },
  classes: function(n){
    if (Data.selected === n){
      return 'active'
    } else {
      return ''
    }
  },
  view: function(vnode){
    var n = vnode.attrs.index
    return m('.choice',{ class: Choice.classes(n), onclick: Choice.click(n) },
      m('span.l'),
      m('span.v',Data.current_question()["option_"+n])
    )
  }
}

Question = {
  view: function(vnode){
    if (Data.current_question() === null){ 
      return false
    }
    return m('.question_wrapper',
      m('.question',Data.current_question().question),
      m(Choice,{index: 'a'}),
      m(Choice,{index: 'b'}),
      m(Choice,{index: 'c'}),
      m(Choice,{index: 'd'})
    )
  }
}

var App = {
  oninit: Data.questions.fetch,
  reset: function(){
    m.request({
      method: "PUT",
      url: "/reset"
    })
    .then(function(data) {
      Data.applyProgress(data)
    })
  },
  submit: function(){
    if (Data.selected === null || Data.question_index === null) return
    m.request({
      method: "PUT",
      url: "/submit",
      body: {
        question_uuid: Data.question_index, 
        choice: Data.selected.toUpperCase()
      },
    })
    .then(function(data) {
      Data.applyProgress(data)
    })
  },
  view: function() {
    return m('main', [
      m("h1", 'Study Sync'),
      m('article',
        m('h2',`Question ${Data.answers_total+1}:`),
        m(Question),
        m('.submit',
          m("button.submit", {onclick: App.submit, disabled: Data.selected === null || Data.question_index === null}, 'Submit')
        )
      ),
      m(".progress",
        m(".total",
          `Total: ${Data.answers_total+1} / ${Data.questions.list.length}`
        ),
        m(".score",
          `Score: ${Data.score} / ${Data.questions.list.length}`
        )
      ),
      m('.reset_wrapper',
        m("button.reset", {onclick: App.reset}, 'Reset')
      )
    ])
  }
}

m.mount(document.body, App)
