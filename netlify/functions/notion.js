exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Credentials now come from Netlify environment variables,
    // not from the browser/client. This means the chart works
    // the same way everywhere: direct visits, embeds, any device.
    const token = process.env.NOTION_TOKEN;
    const dbId = process.env.NOTION_DB_ID;
    const nameProperty = process.env.NOTION_NAME_PROP || 'Name';
    const rateProperty = process.env.NOTION_RATE_PROP || 'Rate';

    if (!token || !dbId) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Server is not configured. Add NOTION_TOKEN and NOTION_DB_ID as environment variables in Netlify.'
        })
      };
    }

    // Call Notion API
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 100 })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: data.message || `Notion API error: ${response.status}`
        })
      };
    }

    // Extract and format the data
    const results = data.results.map(page => {
      const props = page.properties;
      const nameVal = props[nameProperty]?.title?.[0]?.plain_text ||
                     props[nameProperty]?.rich_text?.[0]?.plain_text ||
                     'Unnamed';
      const rateVal = props[rateProperty]?.number || 0;
      return {
        name: nameVal,
        rate: Math.min(10, Math.max(0, rateVal))
      };
    }).filter(item => item.name !== 'Unnamed');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ results })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
