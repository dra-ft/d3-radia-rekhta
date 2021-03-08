// Get the input box
let input = document.getElementById('word-input');

// Init a timeout variable to be used below
let timeout = null;

// Listen for keystroke events
input.addEventListener('keyup', function (e) {
    // Clear the timeout if it has already been set.
    // This will prevent the previous task from executing
    // if it has been less than <MILLISECONDS>
    clearTimeout(timeout);

    // Make a new timeout set to go off in 1000ms (1 second)
    timeout = setTimeout(function () {
        console.log('Input Value:', input.value);

        if(Math.random()*2 <= 1) {
            beginNazm(input.value);
        }
        else {
            beginRadia(input.value);
        }
        
    }, 1000);
});

const beginRadia = (SEARCH_TERM) => {
    let isnum = /^\d+$/.test(SEARCH_TERM);
    if(isnum) {
        let decode_num = "";
        for(let i = 0; i < SEARCH_TERM.length; i+=2) {
            let sub = SEARCH_TERM.substring(i, i+2)
            decode_num += String.fromCharCode(97+(sub%26))
        } 
        console.log(decode_num)
        word2vec(decode_num.toLowerCase())
    }
    else {
        word2vec(SEARCH_TERM.toLowerCase())
    }
}

const beginNazm = (SEARCH_TERM) => {
    fetch('/nazm', {
        method: 'POST', // or 'PUT'
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ search_term: SEARCH_TERM }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        const nazms = data.data;
        const hindi_translation = "पानी";
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
        makeChartData(kwic_lines);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function word2vec(word_input) {
    const wordVectors = ml5.word2vec("../text/wordvecs1000.json", modelLoaded);  
    function modelLoaded() {
        console.log("Model Loaded!")
        // console.log(wordVectors)
        
        // const word_input = document.getElementById("word-input").value
        wordVectors.nearest(word_input, function(err, results) {
        console.log(results)
        if(results) {
            makePhrases(results)
        }
        else {
            saySorry();
        }
        });
    }
}

function saySorry() {
    let svg = d3.create("svg")
        .attr("id", "svg")
        .attr("viewBox", [0, 0, width, height])
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 3 )
        .text("I'm not very good.. try another word?")
        .attr("fill","#808080")
        .attr("font-size", "32px")
        .attr("text-anchor","middle")
    
    let parent = document.getElementById("svg-container")
    let child = document.getElementById("svg")
    if(child) {
        parent.replaceChild(svg.node(), child)  
    }
    else {
        parent.appendChild(svg.node())
    }
  
}

// get phrases from radia text
function makePhrases(potential_words) {

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
      
      console.log(topic);
    
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
      makeChartData(kwic_lines);
      
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
  console.log(result);

  forceNodes = result.map(node => {
    let radius = forceLinks.filter(link => link.source === node.id)
    return {
      id: node.id,
      radius: radius.length*20 !== 0 ? radius.length*20 : 5,
      group: Math.floor(Math.random()*2)
    }
  });

  // console.log(forceNodes);
  console.log(forceNodes);
  let forceData = {
    nodes: forceNodes,
    links: forceLinks
  }
  console.log(forceData);
  
  
  // document.body.appendChild(forceChart(forceData))
  let parent = document.getElementById("svg-container")
  let child = document.getElementById("svg")
  parent.replaceChild(forceChart(forceData), child)
  if(forceData.nodes.length == 0) {
    console.log("no data");
    saySorry();
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