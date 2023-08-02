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
const db = firebase.firestore();

let conversations;
firebase.auth().onAuthStateChanged(user => { 
  if (user) fetchAndDisplayConversations(user); 
  else redirectToLoginPage(); 
});

document.getElementById('sign-out-btn').addEventListener('click', signOut);
const fetchAndDisplayConversations = async (user) => {
  try {
    const companyRef = db.collection('slack_convos').doc('boostUpData');
    const conversationsRef = companyRef.collection('conversations');
    const conversationsSnapshot = await conversationsRef.get();

    if (!conversationsSnapshot.empty) {
      let conversations = [];

      conversationsSnapshot.forEach((doc) => {
        let data = doc.data();
        console.log(data.question.timestamp)
        data.timestamp = data.question.timestamp
        data.author = data.question.author
        // Ensure there's a question property
        if (!data.question) data.question = {};

        // Append ' to the text if it exists
        if (data.question.text) data.question.text += "'";

        data.question.text = data.question.text.replace("<@U0595RZ3P6V>", "")
                data.question.text = data.question.text.replace("'", "")

        
        // Ensure there's a channel property
        if (!data.channel) data.channel = 'No channel provided';

        // Push the updated data to the conversations array
        conversations.push(data);
      });
      console.log(conversations)
      displayConversations(conversations);
      displayAnalytics(conversations);
    }
  } catch (error) {
    console.log('Error getting document:', error);
  }
};



async function signOut() { 
  try { 
    await firebase.auth().signOut(); 
    redirectToLoginPage(); 
  } catch (error) { 
    console.log('Error signing out:', error); 
  } 
}

const displayAnalytics = convos => {
const deflectedCount = convos.reduce((count, conversation) => {
  if (typeof conversation.answer.text === 'string' && conversation.answer.text.includes('Pulling someone in who might know more')) {
    return count + 1;
  } else {
    return count;
  }
}, 0);
  displayDeflectedChart(deflectedCount, convos.length - deflectedCount);
  displayChannelChart(convos);
  displayMostFrequentlySearchedLinksChart(convos);
};

function toggleAnalyticsVisibility() {
  let analytics = document.getElementById('analytics');
    let table = document.getElementById('table-container');
  analytics.style.display = 'block'
  table.style.display = 'none'
  
}


function toggleTableVisibility() {
 let analytics = document.getElementById('analytics');
    let table = document.getElementById('table-container');
  analytics.style.display = 'none'
  table.style.display = 'block'
  
  
}

function displayDeflectedChart(deflectedCount, nonDeflectedCount) {
  google.charts.load('current', { 'packages': ['corechart'] });
  google.charts.setOnLoadCallback(() => {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Question Type');
    data.addColumn('number', 'Count');
    data.addRows([
      ['Deflected Questions', deflectedCount],
      ['Non-Deflected Questions', nonDeflectedCount]
    ]);
    const options = {
      'title': 'Deflected vs Non-Deflected Questions',
      'width': 400,
      'height': 300
    };
    drawChart('PieChart', 'deflected-chart', data, options);
  });
}

function displayChannelChart(channelData) {
  google.charts.load('current', { 'packages': ['corechart'] });
  google.charts.setOnLoadCallback(() => {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Channel');
    data.addColumn('number', 'Count');
    Object.keys(channelData).forEach((channel) => {
      data.addRow([channel, channelData[channel].channel]);
    });
    const options = {
      'title': 'Conversations per Channel',
      'width': 400,
      'height': 300
    };
    drawChart('BarChart', 'channel-chart', data, options);
  });
}

function displayMostFrequentlySearchedLinksChart(convos) {
  const linkCounts = convos.reduce((counts, convo) => {
    (convo.links || []).forEach((link) => {
      counts[link] = (counts[link] || 0) + 1;
    });
    return counts;
  }, {});
  google.charts.load('current', { 'packages': ['corechart'] });
  google.charts.setOnLoadCallback(() => {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Link');
    data.addColumn('number', 'Count');
    Object.keys(linkCounts).forEach((link) => {
      data.addRow([link, linkCounts[link]]);
    });
    const options = {
      'title': 'Most Frequently Searched Links',
      'width': 400,
      'height': 300
    };
    drawChart('BarChart', 'link-chart', data, options);
  });
}

function countChannels(convos) {
  return convos.reduce((counts, convo) => {
    counts[convo.channel_name] = (counts[convo.channel_name] || 0) + 1;
    return counts;
  }, {});
}

function drawChart(chartType, elementId, data, options) {
  new google.visualization[chartType](document.getElementById(elementId)).draw(data, options);
}

function displayConversations(conversations) {
  const table = $('#convo-list').DataTable({
    data: conversations,
     columnDefs: {
            targets: ['_all'],
            className: 'mdc-data-table__cell',
        },
    columns: [
      { data: 'question.timestamp', render: function (data) { return new Date(data).toLocaleString(); }},
      { data: 'channel' },
      { data: 'author' },
      { data: 'question.text' },
      { data: 'answer.text' }
    ],
    destroy: true,
    responsive: true,
    "order": [[ 0, "desc" ]]
  });
}

const redirectToLoginPage = () => {
  window.location.href = './main.html';
};
