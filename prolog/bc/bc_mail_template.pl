:- module(bc_mail_template, [
    bc_mail_register_template/3, % +Name, +Subject, +Text
    bc_mail_render_template/3    % +Name, +Data, -Dict
]).

:- use_module(library(error)).
:- use_module(library(debug)).

:- use_module(library(st/st_render)).

:- dynamic(template/3).

%! bc_mail_register_template(+Name, +Subject, +Text) is det.
%
% Adds or replaces the given file.

bc_mail_register_template(Name, Subject, Text):-
    must_be(atom, Name),
    must_be(string, Subject),
    must_be(string, Text),
    retractall(template(Name, _, _)),
    assertz(template(Name, Subject, Text)),
    debug(bc_mail, 'registered mail template ~w', [Name]).

%! bc_mail_render_template(+Name, +Data, -Dict) is det.
%
% Renders the mail template with given data.

bc_mail_render_template(Name, Data, Dict):-
    must_be(atom, Name),
    must_be(dict, Data),
    (   template(Name, SubjectSource, BodySource)
    ->  true
    ;   throw(error(existence_error(mail_template, Name), _))),
    render_subject(Name, SubjectSource, Data, Subject),
    render_body(Name, BodySource, Data, Body),
    Dict = _{ subject: Subject, body: Body }.

% Renders subject line template.

render_subject(Name, Source, Data, Subject):-
    with_output_to(string(Subject), (
        current_output(Out),
        st_render_string(Source, Data,
            Out, mail/Name/subject, _{
            extension: txt,
            cache: true,
            strip: false,
            frontend: simple
        }))).

% Renders body template.

render_body(Name, Source, Data, Body):-
    with_output_to(string(Body), (
        current_output(Out),
        st_render_string(Source, Data,
            Out, mail/Name, _{
            extension: txt,
            cache: true,
            strip: false,
            frontend: simple
        }))).

% Default mail template for mention mails.

:- Lines = [
        "Hello {{= receiver.name }}\r\n\r\n",
        "You have been mentioned in a comment:\r\n\r\n",
        "{{= comment.content }}"
    ],
    atomic_list_concat(Lines, Body),
    text_to_string(Body, BodyString),
    bc_mail_register_template(
        mention,
        "{{= entry.title }} - comment",
        BodyString).
