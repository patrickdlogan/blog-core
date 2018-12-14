:- module(bc_api_analytics, []).

/** <module> HTTP handlers for managing posts */

:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_wrapper)).

:- use_module(library(arouter)).
:- use_module(library(dict_schema)).

:- use_module(bc_view).
:- use_module(bc_api_io).
:- use_module(bc_api_auth).
:- use_module(bc_api_actor).
:- use_module(bc_data_entry).
:- use_module(bc_analytics).
:- use_module(bc_analytics_db).

% Handlers for data from the readers script.

:- route_post(api/readers/user, record_user).

record_user:-
    bc_read_by_schema(bc_analytics_user, User),
    bc_record_user(User, UserId),
    bc_reply_success(UserId).

:- route_post(api/readers/session, record_session).

record_session:-
    bc_read_by_schema(bc_analytics_session, Session),
    bc_record_session(Session, SessionId),
    bc_reply_success(SessionId).

:- route_post(api/readers/pageview, record_pageview).

record_pageview:-
    bc_read_by_schema(bc_analytics_pageview, Pageview),
    bc_record_pageview(Pageview, PageviewId),
    bc_reply_success(PageviewId).

:- route_post(api/readers/pageview_extend, record_pageview_extend).

record_pageview_extend:-
    bc_read_by_schema(bc_analytics_pageview_extend, Pageview),
    bc_record_pageview_extend(Pageview),
    bc_reply_success(true).

:- route_get(bc/'readers.min.js', visitor_script).

visitor_script:-
    http_current_request(Request),
    module_property(bc_api_analytics, file(File)),
    file_directory_name(File, Dir),
    atom_concat(Dir, '/public/js/readers.min.js', Path),
    http_reply_file(Path, [unsafe(true)], Request).

:- route_get(bc/'readers.min.js.map', visitor_script_map).

visitor_script_map:-
    http_current_request(Request),
    module_property(bc_api_analytics, file(File)),
    file_directory_name(File, Dir),
    atom_concat(Dir, '/public/js/readers.min.js.map', Path),
    http_reply_file(Path, [unsafe(true)], Request).

:- register_schema(bc_analytics_user, _{
    type: dict,
    tag: user,
    keys: _{}
}).

:- register_schema(bc_analytics_session, _{
    type: dict,
    tag: session,
    keys: _{
        user_id: atom,
        agent: atom,
        platform: atom
    }
}).

:- register_schema(bc_analytics_pageview, _{
    type: dict,
    tag: pageview,
    keys: _{
        session_id: atom,
        location: atom,
        referrer: atom,
        elapsed: integer
    }
}).

:- register_schema(bc_analytics_pageview_extend, _{
    type: dict,
    tag: pageview_extend,
    keys: _{
        pageview_id: atom,
        elapsed: integer
    }
}).

% Analytic timeseries results for the administration API.

% TODO: add auth
:- route_get(api/analytics/timeseries/From/To/Duration,
   analytics_timeseries(From, To, Duration)).

% TODO: check atom_number/2 calls.

analytics_timeseries(From, To, Duration):-
    atom_number(Duration, DurationNum),
    parse_month(From, FromParsed),
    parse_month(To, ToParsed),
    bc_analytics_user_ts(FromParsed-ToParsed, DurationNum, Users),
    bc_analytics_session_ts(FromParsed-ToParsed, DurationNum, Sessions),
    bc_analytics_pageview_ts(FromParsed-ToParsed, DurationNum, Pageviews),
    bc_reply_success(_{
        users: Users,
        sessions: Sessions,
        pageviews: Pageviews}).

parse_month(Atom, (YearNum, MonthNum)):-
    atomic_list_concat([Year, Month], -, Atom),
    atom_number(Year, YearNum),
    atom_number(Month, MonthNum).
