:- module(bc_access, [
    bc_entry_exists/1,       % +Id
    bc_read_access_id/2,     % +Actor, +Id
    bc_read_access_entry/2,  % +Actor, +Id
    bc_remove_access_id/2,   % +Actor, +Id
    bc_update_access_id/2,   % +Actor, +Id
    bc_create_access_type/2, % +Actor, +Type
    bc_files_access_id/2,    % +Actor, +Id
    bc_publish_access/3      % +Actor, +NewType, +Id
]).

:- use_module(bc_data_type).
:- use_module(bc_data_role).
:- use_module(bc_entry).

% Succeeds when the Actor has
% read access to the entry.

bc_read_access_entry(Actor, _):-
    Actor.type = admin, !.

bc_read_access_entry(Actor, Entry):-
    bc_type_actor_grants(Entry.type, Actor, Grants),
    (   member(read_any, Grants)
    ;   member(read_own, Grants),
        Actor.'$id' = Entry.author), !.

% Succeeds when the Actor has
% read access to the entry id.

bc_read_access_id(Actor, _):-
    Actor.type = admin, !.

bc_read_access_id(Actor, Id):-
    bc_entry_type(Id, Type),
    bc_type_actor_grants(Type, Actor, Grants),
    (   member(read_any, Grants)
    ;   member(read_own, Grants),
        bc_entry_author(Id, AuthorId),
        Actor.'$id' = AuthorId), !.

% Succeeds when the Actor has
% remove access to the entry.

bc_remove_access_id(Actor, _):-
    Actor.type = admin, !.

bc_remove_access_id(Actor, Id):-
    bc_entry_type(Id, Type),
    bc_type_actor_grants(Type, Actor, Grants),
    (   member(remove_any, Grants)
    ;   member(remove_own, Grants),
        bc_entry_author(Id, AuthorId),
        Actor.'$id' = AuthorId), !.

% Succeeds when the Actor has
% update access to the entry.

bc_update_access_id(Actor, _):-
    Actor.type = admin, !.

bc_update_access_id(Actor, Id):-
    bc_entry_type(Id, Type),
    bc_type_actor_grants(Type, Actor, Grants),
    (   member(update_any, Grants)
    ;   member(update_own, Grants),
        bc_entry_author(Id, AuthorId),
        Actor.'$id' = AuthorId), !.

% Succeeds when the Actor has
% create acess to the entry type.

bc_create_access_type(Actor, _):-
    Actor.type = admin, !.

bc_create_access_type(Actor, Type):-
    bc_type_actor_grants(Type, Actor, Grants),
    memberchk(create, Grants).

% Succeeds when the Actor has
% files acess to the entry.

bc_files_access_id(Actor, _):-
    Actor.type = admin, !.

bc_files_access_id(Actor, Id):-
    bc_entry_type(Id, Type),
    bc_type_actor_grants(Type, Actor, Grants),
    memberchk(files, Grants).

% Succeeds when the Actor has
% publish acess to the entry.

bc_publish_access(Actor, _, _):-
    Actor.type = admin, !.

bc_publish_access(Actor, NewType, Id):-
    bc_entry_type(Id, OldType),
    bc_type_actor_grants(NewType, Actor, NewGrants),
    bc_type_actor_grants(OldType, Actor, OldGrants),
    bc_entry_author(Id, AuthorId),
    (   member(publish_any, NewGrants)
    ;   member(publish_own, NewGrants),
        Actor.'$id' = AuthorId),
    (   member(publish_any, OldGrants)
    ;   member(publish_own, OldGrants),
        Actor.'$id' = AuthorId), !.

% Finds actor permissions for
% the given type. Fails when no
% permissions are granted for the
% actor.

bc_type_actor_grants(Type, Actor, Grants):-
    bc_type(Type, _, _, Roles, _),
    member(Role, Roles),
    Role =.. [Name|Grants],
    Actor.type = Name, !.

bc_entry_exists(Id):-
    bc_entry_type(Id, _), !.

bc_entry_exists(_):-
    throw(error(entry_not_exists)).
