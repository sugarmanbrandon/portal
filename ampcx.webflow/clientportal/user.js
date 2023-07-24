// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA6iMP90Rut3jJN2HQ2YIgDrT-UnkCuGcc",
  authDomain: "ampcx-c65ee.firebaseapp.com",
  projectId: "ampcx-c65ee",
  storageBucket: "ampcx-c65ee.appspot.com",
  messagingSenderId: "415601381670",
  appId: "1:415601381670:web:fcf58a8f913cc9b31831e7",
  measurementId: "G-7TR19C873Z"
};

firebase.initializeApp(firebaseConfig);

// Global variables
const db = firebase.firestore();
let conversations;
let selectedCompany;

// Authentication state change listener
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    fetchAndDisplayConversations(user, selectedCompany);
  } else {
    redirectToLoginPage();
  }
});

// Sign Out button click event listener
document.getElementById('sign-out-btn').addEventListener('click', signOut);


const countChannels = convos => {
  return convos.reduce((channelCounts, conversation) => {
    const channel = conversation.channel_name;
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    return channelCounts;
  }, {});
};
const fetchAndDisplayConversations = async (user, selectedCompany) => {
  if (selectedCompany) {
    console.log(selectedCompany);
  } else {
    selectedCompany = 'boostup';
  }

  const companyRef = db.collection('slack_convos').doc(selectedCompany.toLowerCase());
  try {
    const companyDoc = await companyRef.get();
    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      let allConversations = [];

      for (const channel in companyData) {
        const channelData = companyData[channel];
        for (const data in channelData) {
          const channelConversations = channelData[data];
          allConversations = allConversations.concat(channelConversations);
        }
      }

      conversations = allConversations;
      console.log(conversations);
      displayConversations(conversations);
      displayAnalytics(conversations);
    } else {
      console.log('No such document!');
    }
  } catch (error) {
    console.log('Error getting document:', error);
  }
};
  

document.getElementById('company-select').addEventListener('change', (event) => {
  selectedCompany = event.target.value;
 fetchAndDisplayConversations(firebase.auth().currentUser, selectedCompany);
})


const countNonDeflectedQuestions = convos => {
  return convos.reduce((nonDeflectedQuestions, conversation) => {
    if (conversation.answer.includes('Pulling someone in who might know more')) {
      const question = conversation.question;
      nonDeflectedQuestions[question] = (nonDeflectedQuestions[question] || 0) + 1;
    }
    return nonDeflectedQuestions;
  }, {});
};
const countKeywords = (convos, minKeywordLength = 3) => {
  const keywordCounts = {};
  const commonPhrases = ['the', 'and', 'or', 'in', 'on', 'at', 'for', 'with', 'about', 'as', 'by', 'to', 'of', 'a', 'an'];

  convos.forEach(conversation => {
    const text = conversation.question + ' ' + conversation.answer;
    const phrases = text.toLowerCase().split(/[\.\?\!]+/);

    phrases.forEach(phrase => {
      const words = phrase.trim().split(/\W+/);
      if (words.length >= minKeywordLength && !commonPhrases.includes(phrase)) {
        keywordCounts[phrase] = (keywordCounts[phrase] || 0) + 1;
      }
    });
  });

  return keywordCounts;
};

function drawChart(chartType, elementId, data, options) {
  let chart;
  if (chartType === 'BarChart') {
    chart = new google.visualization.BarChart(document.getElementById(elementId));
  } else if (chartType === 'PieChart') {
    chart = new google.visualization.PieChart(document.getElementById(elementId));
  }
  chart.draw(data, options);
}
function displayWordCloudChart(keywordCounts) {
  const wordArray = Object.entries(keywordCounts).map(([word, count]) => ({ text: word, size: count * 5 }));
  const width = 400, height = 300;
  const svg = d3.select('#word-cloud-chart').append('svg').attr('width', width).attr('height', height);
  const layout = d3.layout.cloud().size([width, height]).words(wordArray).padding(5).rotate(() => (~~(Math.random() * 6) - 3) * 30).font('Roboto, Arial, sans-serif').fontSize(d => d.size).on('end', draw);
  layout.start();

  function draw(words) {
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)
      .selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', d => `${d.size}px`)
      .style('font-family', 'Roboto, Arial, sans-serif')
      .style('fill', (d, i) => color(i))
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
      .text(d => d.text)
      .on('mouseover', function (d) {
        d3.select(this).style('cursor', 'pointer').style('fill', 'black');
        // Show tooltip with keyword and count
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`Keyword: ${d.text}<br>Count: ${d.size}`)
          .style('left', `${d3.event.pageX}px`)
          .style('top', `${d3.event.pageY - 28}px`);
      })
      .on('mouseout', function (d, i) {
        d3.select(this).style('cursor', 'default').style('fill', color(i));
        // Hide tooltip
        d3.select('body').select('.tooltip').remove();
      });
  }
}

function displayMostFrequentlySearchedLinksChart(convos) {
  const linkCounts = {};
  for (const convo of convos) {
    const answer = convo.answer;
    const linkRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(answer)) !== null) {
      const link = linkMatch[0];
      linkCounts[link] = (linkCounts[link] || 0) + 1;
    }
  }

  const linkData = Object.entries(linkCounts).map(([link, count]) => ({ link, count }));

  // Load the Visualization API and the corechart package.
  google.charts.load('current', { 'packages': ['corechart'] });

  // Set a callback to run when the Google Visualization API is loaded.
  google.charts.setOnLoadCallback(() => {
    // Create the data table.
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'URL');
    data.addColumn('number', 'Count');

    const rows = linkData.map(({ link, count }) => [link, count]);
    data.addRows(rows);

    // Set chart options
    var options = {
      'title': 'Most Commonly Searched Links',
      'width': 400,
      'height': 300
    };

    // Instantiate and draw our chart, passing in some options.
    drawChart('BarChart', 'most-frequently-searched-links-chart', data, options);
  });
}
const displayAnalytics = convos => {
  const deflectedCount = convos.reduce((count, conversation) => {
    return count + !conversation.answer.includes('Pulling someone in who might know more');
  }, 0);
  const keywordCounts = countKeywords(convos);
  d3.select('#word-cloud-chart').text('')


    displayWordCloudChart(keywordCounts);


  displayDeflectedChart(deflectedCount, convos.length - deflectedCount);
  displayChannelChart(countChannels(convos));
  displayMostFrequentlySearchedLinksChart(convos)
};

function displayChannelChart(channelCounts) {
  // Load the Visualization API and the corechart package.
  google.charts.load('current', { 'packages': ['corechart'] });

  // Set a callback to run when the Google Visualization API is loaded.
  google.charts.setOnLoadCallback(() => {
    // Create the data table.
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Channel');
    data.addColumn('number', 'Count');

    const rows = Object.entries(channelCounts).map(([channel, count]) => [channel, count]);
    data.addRows(rows);

    // Set chart options
    var options = {
      'title': 'Messages by Channel',
      'width': 400,
      'height': 300
    };

    // Instantiate and draw our chart, passing in some options.
    drawChart('PieChart', 'channel-chart', data, options);
  });
}


function displayDeflectedChart(deflectedCount, nonDeflectedCount) {
  // Load the Visualization API and the corechart package.
  google.charts.load('current', { 'packages': ['corechart'] });

  // Set a callback to run when the Google Visualization API is loaded.
  google.charts.setOnLoadCallback(() => {
    // Create the data table.
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Question Type');
    data.addColumn('number', 'Count');
    data.addRows([
      ['Deflected Questions', deflectedCount],
      ['Non-Deflected Questions', nonDeflectedCount]
    ]);

    // Set chart options
    var options = {
      'title': 'Deflected vs Non-Deflected Questions',
      'width': 400,
      'height': 300
    };

    // Instantiate and draw our chart, passing in some options.
    drawChart('PieChart', 'deflected-chart', data, options);
  });
}
const redirectToLoginPage = () => {
  window.location.href = './index.html';
};

async function signOut() {
  try {
    await firebase.auth().signOut();
    redirectToLoginPage();
  } catch (error) {
    console.log('Error signing out:', error);
  }
}

const toggleAnalyticsVisibility = () => {
  const analyticsDiv = document.getElementById('analytics');
  const tableDiv = document.getElementById('table-container');
  tableDiv.style.display = "none";
  analyticsDiv.style.display = analyticsDiv.style.display === 'none' ? 'grid' : 'none';
};

const toggleTableVisibility = () => {
  const tableDiv = document.getElementById('table-container');
  const analyticsDiv = document.getElementById('analytics');
  analyticsDiv.style.display = "none";

  tableDiv.style.display = tableDiv.style.display === 'none' ? 'block' : 'none';
};


function displayConversations(convos) {
  convos.forEach(conversation => {
    if (Array.isArray(conversation['answer'])) {
      conversation['answer'] = conversation['answer'].map(answer => `${answer['author']}: ${answer['text']}`).join('<br>');
    } else {
      conversation['answer'] = `${conversation['answer']['author']}: ${conversation['answer']['text']}`;
    }
    conversation['timestamp'] = conversation['timestamp'].toDate();
  });
  var convoList = document.getElementById('convo-list');
  if ($.fn.DataTable.isDataTable('#convo-list')) {
    // Clear and destroy the existing DataTable
    $('#convo-list').DataTable().clear().destroy();
  }
  // Create a new DataTable with the updated data
  $('#convo-list').DataTable({
    data: convos,
    columns: [
      { title: 'Question', data: 'question' },
      { title: 'Answer', data: 'answer', render: function(data, type, row) {
        if (type === 'display') {
          const linkRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
          const linkMatch = linkRegex.exec(data);
          const link = linkMatch ? linkMatch[0] : null;
          if (link) data = data.replace(linkRegex, `<a href="${link}" target="_blank">this link</a>`);
          data = data.replace(/\n/g, '<br>');
        }
        return data;
      }},
      { title: 'Timestamp', data: 'timestamp' }, { title: 'Channel', data: 'channel_name' }
    ],
    autoWidth: false,
    columnDefs: [
      { width: '30%', targets: 0 },{ width: '40%', targets: 1 },{ width: '15%', targets: 2 },{ width: '15%', targets: 3 }
    ]
  });

  // Initialize search functionality
  $(document).ready(function() {
    $('#convo-list thead th').each(function() {
      var title = $(this).text();
      $(this).html('<input type="text" placeholder="Search ' + title + '" />');
    });
    var table = $('#convo-list').DataTable();
    table.columns().every(function() {
      var that = this;
      $('input', this.header()).on('keyup change clear', function() {
        if (that.search() !== this.value) that.search(this.value).draw();
      });
    });
  });
}
