
// Get the input box
let input = document.getElementById('word-input')
let inputButton = document.getElementById('word-button')
let platformSelect = document.getElementById('platform-select')
let word2Vec = ml5.word2vec("../text/wordvecs1000.json", modelLoaded)
function modelLoaded() {
  console.log("Model Loaded!")
}

inputButton.addEventListener('click', (e) => {
  sayMessage('working on it...')
  let platform = platformSelect.value
  console.log('Your word is ', input.value, ' with platform ', platform)
  switch(platform) {
    case 'padma':
      beginPadma(input.value)
      break
    case 'radia': 
      beginRadia(input.value)
      break
    case 'rekhta': 
      beginNazm(input.value)
      break
  }
  e.preventDefault()
})

// Listen for keystroke events
input.addEventListener('keyup', function (e) {
    sayMessage("listening...")
});

const populatePhraseContainer = (phrases) => {
  let phraseContainer = document.getElementById('phrase-container')
  phraseContainer.innerHTML = ''
  phrases.forEach(p => {
    let ele = document.createElement('p')
    ele.innerHTML = p
    phraseContainer.appendChild(ele)
  })
}

const beginPadma = (SEARCH_TERM) => {
  fetch('/padma', {
    method: 'POST', 
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ search_term: SEARCH_TERM }),
  })
  .then(results => results.json())
  .then(data => {
    // console.log(data)
    const lines = []
    data.forEach(arr => {
      if(arr.length > 0) lines.push(...arr)
    })
    // console.log(lines)

    let opts = {
      ignoreCase: true,
      ignoreStopWords: false
    };
    RiTa.concordance(lines.join(''), opts);
    let kwic_lines = RiTa.kwic(SEARCH_TERM, 10);
    kwic_lines = kwic_lines.sort(() => Math.random() - Math.random()).slice(0, 5)
    let regexp = new RegExp(`${SEARCH_TERM}.+`, 'gi');
    kwic_lines = kwic_lines.map(line => {
      line = line.toLowerCase().replace(/[.,]+/g, '')
      console.log(line)
      if(line.match(regexp)) return line.match(regexp)[0]
      else return null
    })
    kwic_lines = kwic_lines.filter(line => line !== null)
    console.log(kwic_lines)
    populatePhraseContainer(kwic_lines)
    makeChartData(kwic_lines)
  })
}

const beginRadia = (SEARCH_TERM) => {
  let results = word2vec(SEARCH_TERM.toLowerCase())
  results.then((wordArr) => {
    if(wordArr) {
      makePhrases(wordArr).then((phrases) => {
        console.log(phrases)
        populatePhraseContainer(phrases)
        makeChartData(phrases)
      })
    } 
    else {
      sayMessage("I'm not very good.. try another word?");
    } 
  })
}

const beginNazm = (SEARCH_TERM) => {
  fetch('/nazm', {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ search_term: SEARCH_TERM }),
  })
  .then(response => response.json())
  .then(data => {
    if(data.data == null && data.hindi_translation == null) {
      sayMessage("I'm not very good.. try another word?");
      return;
    }
    const nazms = data.data;
    const hindi_translation = data.hindi_translation;
    const filtered_lines = [];
    nazms.forEach(nazm => {
      nazm.split("\n").forEach(line => {
        if(line.includes(hindi_translation)) {
          filtered_lines.push(line)
        }
      })
    })
    console.log(filtered_lines)
    
    let opts = {
      ignoreCase: true,
      ignoreStopWords: true
    };
    RiTa.concordance(filtered_lines.join(''), opts);
    let kwic_lines = RiTa.kwic(hindi_translation, 5);
    // console.log(kwic_lines)
    kwic_lines = kwic_lines.sort(() => Math.random() - Math.random()).slice(0, 5)
    populatePhraseContainer(kwic_lines)
    makeChartData(kwic_lines);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

function word2vec(word_input) {
  return new Promise((resolve, reject) => {
    word2Vec.nearest(word_input, function(err, results) {
      return resolve(results)
    });
  })
 
}

function sayMessage(message) {
  let svg = d3.create("svg")
          .attr("id", "svg")
          .attr("viewBox", [0, 0, width, height])
    
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 3 )
      .text(message)
      .attr("fill","#808080")
      .attr("font-size", "22px")
      .attr("text-anchor","middle")
    
  let parent = document.getElementById("svg-container")
  let child = document.getElementById("svg")
  if(child) parent.replaceChild(svg.node(), child) 
  else parent.appendChild(svg.node())  
}

// get phrases from radia text
function makePhrases(potential_words) {
  return new Promise((resolve, reject) => {
    fetch("../text/plain-radia-with-characters.txt")
      .then(response => response.text())
      .then(text => {
        text = text.replace(/<\/?[^>]+(>|$)/g, "");
      
        // find topic
        let topic = null;
        for(let i = 0; i < potential_words.length; i++) {
          if(text.includes(potential_words[i].word)) {
            topic = potential_words[i].word;
            break;
          }
        }
        
        let sentences = text.split("\n");
        // let sents_about_topic = sentences.filter(sent => sent.includes(topic))
        // let onlyDialogues = sents_about_topic.map(line => {
        //   return line.substring(line.indexOf(":")+1).trim()
        // });
        // console.log(onlyDialogues);
        // makeChartData(onlyDialogues);
      
        // markov
        // let generator = RiTa.markov(3)
        // onlyDialogues.forEach(dial => generator.addText(dial))
        // let generated = generator.generate(1);
        // console.log(generated)
      
        // kwic
        let opts = {
        ignoreCase: true,
        ignoreStopWords: true
        };
      
        let sents_without_characters = sentences.map(line => {
          return line.substring(line.indexOf(":")+1).trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g," ")
        });
        RiTa.concordance(sents_without_characters.join(''), opts);
        let kwic_lines = RiTa.kwic(topic, 5);
        // console.log(kwic_lines)
        kwic_lines = kwic_lines.sort(() => Math.random() - Math.random()).slice(0, 5)
        return resolve(kwic_lines);
        
      })
  })
}

function makeChartData(data) {

  let forceNodes = [];
  
  let forceLinks = [];
  for(let i = 0; i < data.length; i++) {
    let words = data[i].split(" ");
    for(let j = 0; j < words.length; j++) {
      let source = words[j];
      forceNodes.push({id: source, group: 1});

      if(j+1 <= words.length-1) {
        let target = words[j+1];
        forceLinks.push({source: source, target: target, value: 10});
      }

    }
  } 
  
  let maxLength = Math.min(...data.map(ele => ele.split(" ").length));
  for(let i = 0; i < data.length-1; i++) {
    let beforeLine = data[i].split(" ");
    let afterLine = data[i+1].split(" ");
    for(let j = 0; j < maxLength; j++) {
      let source = beforeLine[j];
      let target = afterLine[j];
      
      forceLinks.push({source: source, target: target, value: 20});
    }
  }

  const result = Array.from(new Set(forceNodes.map(ele => ele.id)))
  .map(id => {
    return {id: id, group: 1};
  });;

  forceNodes = result.map(node => {
    let radius = forceLinks.filter(link => link.source === node.id)
    return {
      id: node.id,
      radius: radius.length*20 !== 0 ? radius.length*20 : 5,
      group: Math.floor(Math.random()*2)
    }
  });

  let forceData = {
    nodes: forceNodes,
    links: forceLinks
  }
  
  
  // document.body.appendChild(forceChart(forceData))
  let parent = document.getElementById("svg-container")
  let child = document.getElementById("svg")
  parent.replaceChild(forceChart(forceData), child)
  if(forceData.nodes.length == 0) {
    console.log("no data");
    sayMessage("I'm not very good.. try another word?");
  }

}
const drag = simulation => {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}
const color = () => {
  const scale = d3.scaleOrdinal(d3.schemeCategory10);
  return d => scale(d.group);
}
let width = document.body.clientWidth;
width = width - width/10;
const height = document.body.clientHeight*4/5;
const forceChart = (forceData) => {
  const links = forceData.links.map(d => Object.create(d));
  const nodes = forceData.nodes.map(d => Object.create(d));

  const simulation = d3.forceSimulation()
      // .force("link").links(links)
      // .force("link", d3.forceLink().distance(function(d) {return d.value}).strength(0.01).id(d => d.id))
      .force("link", d3.forceLink().id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2))
      // .force('collision', d3.forceCollide().radius(function(d) {
      //   return d.radius
      // }))
  
  simulation.nodes(nodes)
  simulation.force("link").links(links)
  

  const svg = d3.create("svg")
      .attr("id", "svg")
      .attr("viewBox", [0, 0, width, height]);

  const node = svg.append("g")
      // .attr("stroke", "#fff")
      // .attr("stroke-width", 1.5)  
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", function(d) { return d.radius/2; })
      .attr("fill", "#f5f5f5")
      .call(drag(simulation))

  const link = svg.append("g")
      .attr("stroke", "red")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      // .attr("stroke-width", d => Math.sqrt(d.value));
      .attr("stroke-width", 2) 


  const text = svg.append("g")
      .attr("class", "textsvg")
      .selectAll("text")
      .data(nodes)
      // .join(".label")
      .join("text")
      .attr('x', function(d) { return d.x; })
      .attr('y', function(d) { return d.y; })
      // .attr('fill', 'white')
      .text(d => d.id)

  // const back = svg.append("g")
  //     // .attr("class", "")
  //     .selectAll("div")
  //     .data(nodes)
  //     .join("div")
  //     .attr("class", ".back")
  //     .attr("transform", function(d) { return `translate(${d.x}, ${d.y})`})
  //     .attr("width", 20)
  //     .attr("height", 10)
  //     .text(d => d.id)
  

  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    text 
        .attr("x", d => d.x+10)
        .attr("y", d => d.y);
  });

  // invalidation.then(() => simulation.stop());

  return svg.node();
}