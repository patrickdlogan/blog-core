var api = require('../api');
var message = require('../message');
var languages = require('../languages');
var files_item = require('./files_item');

// Creates post view model for already
// existing post or a new post. For new
// post, data must be unset. The authors
// argument must contain the list of all
// users.

exports.create = function(userInfo, type, types, authors, files, data) {

    var post = {

        $id: ko.observable(),

        // List of authors. Used by the
        // author list dropdown.

        authors: authors,

        // The post title. When this is
        // the new post then initial slug
        // is generated by it.

        title: ko.observable('Untitled'),

        // The post slug. Can contain
        // "safe" characters only.

        slug: ko.observable('untitled'),

        // The post description. Can
        // be left blank.

        description: ko.observable(''),

        // The post content. Can be either
        // Markdown or raw HTML.

        content: ko.observable(''),

        types: types,

        // The post type. Currently
        // available types are post,
        // page and block.

        type: ko.observable(type),

        // Type of the post content.
        // Will be processed by the
        // Markdown formatter when set
        // to 'markdown''

        content_type: ko.observable('markdown'),

        // Flag to set whether the post
        // is published or not.

        published: ko.observable(false),

        // Flag to set whether commenting
        // is allowed or not.

        commenting: ko.observable(true),

        // List of tags. Tags are separated
        // by commas.

        tags: ko.observable(''),

        // The count of comments.
        // Currently not used.

        comments: ko.observable(0),

        // Selected user. Only admins
        // can select author other than
        // themself.

        author: ko.observable(),

        // Publish date as a string in
        // the format YYYY-MM-DD. Might be
        // unset when published flag is not set.

        date: ko.observable(''),

        // Update date as a string in
        // the format YYYY-MM-DD.

        update: ko.observable(''),

        // Validates the post data.
        // Saves or updates it using the API.

        submit: function() {

            submitPost(post, 'edit');
        },

        // Similar to submit but leaves
        // the form.

        save: function() {

            submitPost(post, 'leave');
        },

        // Similar to submit but opens preview
        // in another window.

        saveAndPreview: function() {

            submitPost(post, 'preview');
        },

        // The post language code. See
        // languages.js for the list of codes.

        language: ko.observable(bcLanguage),

        // List of available languages.

        languages: languages,

        // Indicator for files component.

        slug_changed: ko.observable(false),

        // Only admin can change the type.

        can_change_type: userInfo.type === 'admin',

        // Only admin can change the author.

        can_change_author: userInfo.type === 'admin',

        // Array of entry files.

        files: ko.observableArray(files),

        // Input errors for the errors
        // binding.

        errors: {

            title: ko.observableArray([]),
            slug: ko.observableArray([]),
            content: ko.observableArray([]),
            date: ko.observableArray([]),
            update: ko.observableArray([])
        },

        // Returns the plain data object
        // to send to the backend.

        toJS: function() {

            var tags = post.tags().trim();

            var date = post.date();

            // date_published will be undefined when
            // no date has been entered.

            var date_published;

            if (date !== '') {

                date_published = isoDateToUnix(date);
            }

            var date_updated = isoDateToUnix(post.update());

            return {

                author: post.author(),
                title: post.title(),
                slug: post.slug(),
                description: post.description(),
                content: post.content(),
                type: post.type(),
                date_published: date_published,
                date_updated: date_updated,
                commenting: post.commenting(),
                published: post.published(),
                content_type: post.content_type(),
                tags: tags === '' ? [] : tags.split(/\, */),
                language: post.language()
            };
        }
    };

    var typeInfo;

    types.forEach(function(info) {

        if (info.name === type) {

            typeInfo = info;
        }
    });

    if (!typeInfo) {

        throw new Error('Invalid type ' + type);
    }

    // Use the preview URL pattern from
    // type info.

    post.preview = typeInfo.preview;

    // Sets the view model values by the
    // actual data object.

    if (data) {

        // When the publish date is set then
        // set the date field to formatted string.

        if (typeof data.date_published !== 'undefined') {

            var d = new Date(data.date_published * 1000);

            post.date(d.toISOString().substring(0, 10));
        }

        post.$id(data.$id);
        post.author(data.author);
        post.title(data.title);
        post.slug(data.slug);
        post.description(data.description || '');
        post.content(data.content);
        post.type(data.type);
        post.content_type(data.content_type);
        post.published(data.published);
        post.commenting(data.commenting);
        post.tags(data.tags.join(', '));
        post.comments(data.comments);
        post.language(data.language);

        // Set up the existing files list.

        files.sort(function(left, right) {

            return left.name === right.name ? 0 : (left.name < right.name ? -1 : 1);
        });

        post.files(files.map(function(file) {

            return files_item.create(data.slug, file);

        }));

    } else {

        // Only when for new post.
        // Add automatic slug generation.

        post.title.subscribe(function(value) {

            post.slug(getSlug(value));
        });

        // Select user as post author.

        post.author(userInfo.$id);

        // Default publish date.

        post.date(new Date().toISOString().substring(0, 10));
    }

    // Set publishing permission flag.

    post.can_publish = false;

    if (userInfo.type === 'admin') {

        post.can_publish = true;
    }

    if (typeInfo.grants.indexOf('publish_any') >= 0) {

        post.can_publish = true;
    }

    if (typeInfo.grants.indexOf('publish_own') >= 0) {

        if (post.author() === userInfo.$id) {

            post.can_publish = true;
        }
    }

    // Sets file management flag.

    post.can_manage_files = false;

    if (userInfo.type === 'admin') {

        post.can_manage_files = true;
    }

    if (typeInfo.grants.indexOf('update_any') >= 0) {

        if (typeInfo.grants.indexOf('files') >= 0) {

            post.can_manage_files = true;
        }
    }

    if (typeInfo.grants.indexOf('update_own') >= 0) {

        if (post.author() === userInfo.$id) {

            if (typeInfo.grants.indexOf('files') >= 0) {

                post.can_manage_files = true;
            }
        }
    }

    // Default update date is the current date.

    post.update(new Date().toISOString().substring(0, 10));

    post.published.subscribe(function(value) {

        // Set publish date when post is published.
        // Applies only when no publish date is set.

        if (value && post.date() === '') {

            post.date(new Date().toISOString().substring(0, 10));
        }
    });

    // Indicated that slug has been changed
    // and file management does not work before
    // saving.

    post.slug.subscribe(function(value) {

        post.slug_changed(true);
    });

    // Submits the file upload form and
    // performs the file upload process.

    post.uploadFile = function() {

        var file = document.getElementById('entry-file').files[0];

        if (!file || !post.$id()) {

            return;
        }

        api.upload(post.$id(), file).then(function(response) {

            message.info('File "' + file.name + '" has been uploaded.');

            post.files.push(files_item.create(post.slug(), { name: file.name }));

            // This resets the file input.

            var wrap = document.getElementById('entry-file-wrap');

            wrap.innerHTML = '';
            wrap.innerHTML = '<input type="file" id="entry-file" class="form-control" placeholder="Your file">';

        }).catch(message.error);
    };

    // Removes the file.
    // Asks confirmation.

    post.removeFile = function(file) {

        if (confirm('Remove the file "' + file.name + '"?')) {

            api.removeFile(post.$id(), file.name).then(function() {

                message.info('File "' + file.name + '" has been removed.');

                post.files.remove(file);

            }).catch(message.error);
        }
    };

    return post;
};

// Converts ISO8601 date part into
// an Unix timestamp.

function isoDateToUnix(string) {

    var match = string.match(/^(\d{4})\-(\d{2})\-(\d{2})$/);

    if (!match) {

        throw new Error('Date does not match pattern: ' + string);
    }

    var date = new Date();

    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));

    return Math.floor(date.getTime() / 1000);
}

// Validates the given post.
// Adds errors using the validate module.

function validatePost(post) {

    if (post.title() === '') {

        post.errors.title.push('Title is not entered.');
    }

    var slug = post.slug();

    if (slug === '') {

        post.errors.slug.push('Slug is not entered.');

    } else {

        if (!slug.match(/^[a-z0-9\-_]+$/)) {

            post.errors.slug.push('Use lowercase letters, numbers, hyphen and underscore.');
        }
    }

    if (post.content() === '') {

        post.errors.content.push('Content is not entered.');
    }

    var date = post.date();

    if (date === '') {

        if (post.published()) {

            post.errors.date.push('Publish date is not entered.');
        }

    } else if (!date.match(/^\d{4}\-\d{2}\-\d{2}$/)) {

        post.errors.date.push('Date must be in the YYYY-MM-DD format.');
    }

    var update = post.update();

    if (update === '') {

        post.errors.update.push('Update date is not entered.');

    } else if (!update.match(/^\d{4}\-\d{2}\-\d{2}$/)) {

        post.errors.update.push('Update date must be in the YYYY-MM-DD format.');
    }
}

// Handles save and
// save-with-continue actions.

function submitPost(post, action) {

    var form = document.getElementById('post');

    // Clear errors.

    Object.keys(post.errors).forEach(function(key) {

        post.errors[key]([]);
    });

    validatePost(post);

    var input = form.querySelector(
        '.has-error input, .has-error textarea, .has-error checkbox');

    if (input) {

        input.focus();

        return false;
    }

    // When post has '$id' property
    // then it's an existing post.

    if (post.$id()) {

        updatePost(form, post, action);

    } else {

        savePost(form, post, action);
    }
}

// Updates the already existing
// post. Assumes that the post
// is validated.

function updatePost(form, post, action) {

    api.updatePost(post.$id(), post.toJS()).then(function() {

        message.info('The entry "' + post.title() + '" has been updated.');

        if (action === 'edit' || action === 'preview') {

            post.slug_changed(false);

            if (action === 'preview') {

                openPreview(post);
            }

        } else {

            route.go('entries/' + post.type());
        }

    }).catch(message.error);
}

// Saves the new post.

function savePost(form, post, action) {

    api.savePost(post.toJS()).then(function(res) {

        message.info('The entry "' + post.title() + '" has been saved.');

        // Redirect to post page when we
        // want to keep editing the post.
        // Otherwise go back to listing page.

        if (action === 'edit' || action === 'preview') {

            route.go('entry/' + post.type() + '/' + res);

            if (action === 'preview') {

                openPreview(post);
            }

        } else {

            route.go('entries/' + post.type());
        }

    }).catch(message.error);
}

// Opens the preview window/tab for the post.

function openPreview(post) {

    var url = post.preview.replace(/<slug>/g, post.slug());

    var opened = window.open(url, 'entry-' + post.slug());

    if (opened) {

        // Could have been blocked by a
        // popup blocker.

        opened.focus();
    }
}
