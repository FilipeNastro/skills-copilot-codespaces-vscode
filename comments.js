// Create web server
const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const axios = require('axios');
const cors = require('cors');

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex');
    const postId = req.params.id;
    const { content } = req.body;

    // Get comments for post
    const comments = commentsByPostId[postId] || [];

    // Add comment to comments
    comments.push({ id: commentId, content, status: 'pending' });

    // Update comments
    commentsByPostId[postId] = comments;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId,
            status: 'pending'
        }
    });

    // Send response
    res.status(201).send(comments);
});

// Handle event
app.post('/events', async (req, res) => {
    const { type, data } = req.body;

    // Check type of event
    if (type === 'CommentModerated') {
        // Get data from event
        const { id, postId, status, content } = data;

        // Get comments for post
        const comments = commentsByPostId[postId];

        // Find comment
        const comment = comments.find(comment => {
            return comment.id === id;
        });

        // Update comment
        comment.status = status;

        // Emit event to event bus
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content
            }
        });
    }

    // Send response
    res.send({});
});

// Listen on port
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});