## Davis Problems Schema Reference

> **⚠️ For complete problem analysis workflows, see [DynatraceIncidentResponse.md](../workflows/DynatraceIncidentResponse.md)**

Every Davis problem update is exported to Grail with guaranteed updates at least every 6 hours.

**Field Reference For:**

- **../workflows/DynatraceIncidentResponse.md** - Complete problem investigation framework using these fields
- **../workflows/dataSourceGuides/DynatraceSpanAnalysis.md** - Root cause analysis using affected entities from problems
- **../workflows/dataSourceGuides/DynatraceDataInvestigation.md** - Log correlation during problem timeframes

Problems represent anomalies in normal behavior detected through Dynatrace's context-aware analysis across time, processes, hosts, services, and applications.

### Quick Reference Queries

```sql
// All unique problems
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate)
| fields id=display_id, title=event.name, status=event.status

// Active problems only
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| fields id=display_id, title=event.name, status=event.status

// Specific problem details
fetch dt.davis.problems
| filter display_id == "P-12345678"
| fields id=display_id, title=event.name, status=event.status
```

> **📖 Complete Analysis Guide**: See [DynatraceIncidentResponse.md](../workflows/DynatraceIncidentResponse.md) for comprehensive problem investigation workflows, entity correlation, and real-world examples.

---

Count the total number of active problems in the last hour.

_Davis CoPilot description: Count the total number of active problems in the last hour as 'active_problem_count'._

```sql
fetch dt.davis.problems, from:-1h
| filter not(dt.davis.is_duplicate)
| filter event.status == "ACTIVE"
| summarize active_problem_count = count()
```

---

Chart the number of currently active problems over the last 24 hours.

_Davis CoPilot description: Chart me the number of currently active problems over the last 24 hours in 1 hour intervals as 'active_problems'._

```sql
fetch dt.davis.problems, from:-24h
| filter event.status == "ACTIVE"
| makeTimeseries active_problems = count(), interval:1h, spread: timeframe(from:event.start, to:coalesce(event.end, now()))
```

---

Shows the logs of all entities affected by the problem 'P-12345678'.

_Davis CoPilot description: Show the logs of all entities affected by the problem with the display id 'P-12345678'._

```sql
fetch logs
| filter dt.source_entity in [
fetch dt.davis.problems
| filter display_id == "P-12345678"
| fields affected_entity_ids
]
```

<!-- end_model -->

### Event

This section contains general event information.

<!-- semconv davis.problem.general -->
<!-- The content of this table is generated. Please do not edit manually. -->

| Attribute                                          | Type      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Examples                                                                                             |
| -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [`event.category`](../../fields/event.md)          | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Standard categorization based on the significance of an event (similar to the severity level in the previous Dynatrace).                                                                                                                                                                                                                                                                                                           | `AVAILABILITY`; `ERROR`; `SLOWDOWN`; `RESOURCE_CONTENTION`; `CUSTOM_ALERT`; `MONITORING_UNAVAILABLE` |
| [`event.description`](../../fields/event.md)       | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>A description of the problem. The problem description contains the different event descriptions from the events of the problem.                                                                                                                                                                                                                                                                                                    | `The current response time (11 s) exceeds the auto-detected baseline (767 ms) by 1,336 %`            |
| [`event.end`](../../fields/event.md)               | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>The problem end timestamp in UTC (given in Grail preferred Linux timestamp nano precision format).                                                                                                                                                                                                                                                                                                                                 | `16481073970000`                                                                                     |
| [`event.id`](../../fields/event.md)                | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Unique identifier string of a problem, is stable across refreshes and updates.                                                                                                                                                                                                                                                                                                                                                     | `5547782627070661074_1647601320000`                                                                  |
| [`event.kind`](../../fields/event.md)              | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Gives high-level information about what kind of information the event contains without being specific about the contents of the event. It helps to determine the record type of a raw event.<br>Tags: `permission`                                                                                                                                                                                                                 | `DAVIS_PROBLEM`                                                                                      |
| [`event.name`](../../fields/event.md)              | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>The human readable display name of an event type.                                                                                                                                                                                                                                                                                                                                                                                  | `CPU saturation`; `Multiple infrastructure problems`                                                 |
| [`event.start`](../../fields/event.md)             | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>The problem start timestamp in UTC (given in Grail preferred Linux timestamp nano precision format). This is different from the timestamp even for the first record, as event sources require some time to analyze the underlying data, so the time when a problem update is created (timestamp) differs from the time when the event started (event.start)                                                                        | `16481073970000`                                                                                     |
| [`event.status`](../../fields/event.md)            | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Status of an event as being either Active or Closed.                                                                                                                                                                                                                                                                                                                                                                               | `ACTIVE`; `CLOSED`                                                                                   |
| [`event.status_transition`](../../fields/event.md) | string    | ![Experimental](https://img.shields.io/badge/-experimental-orange)<br>An enum that shows the transition of the above event state.                                                                                                                                                                                                                                                                                                                                                                | `CREATED`; `UPDATED`; `REFRESHED`; `RESOLVED`; `REOPENED`; `CLOSED`                                  |
| [`timestamp`](../../fields/readme.md)              | timestamp | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>The time (UNIX Epoch time in nanoseconds) when the event originated, typically when the source created it. If no original timestamp is available, it will be populated at ingest time and required for all events. In the case of a correlated event (for example, ITIL events), this time could be different from the event.start time, as this time represents the actual timestamp when the "update" for the event was created. | `1649822520123123123`                                                                                |

<!-- endsemconv -->

### Davis system fields

This section contains fields that the Davis routine sets.

<!-- semconv davis.problem.system -->
<!-- The content of this table is generated. Please do not edit manually. -->

| Attribute                          | Type      | Description                                                                                                                                                                                                                                                                                                                                                                                                                | Examples                               |
| ---------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `display_id`                       | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>A pretty, mostly unique id for the problem.                                                                                                                                                                                                                                                                                                                  | `P-2307288`                            |
| `dt.davis.affected_users_count`    | long      | ![Experimental](https://img.shields.io/badge/-experimental-orange)<br>The estimated count of users affected by the problem for the application with the highest individual impact.                                                                                                                                                                                                                                         |                                        |
| `dt.davis.event_ids`               | string[]  | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>A collection of Davis event ids that belong to the problem.                                                                                                                                                                                                                                                                                                  | `[-2127669892157121805_1688396340000]` |
| `dt.davis.is_duplicate`            | boolean   | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Indicates if the problem has become a duplicate of another problem. Duplicates can be related by looking for event ids that are part of multiple problems.                                                                                                                                                                                                   |                                        |
| `dt.davis.last_reopen_timestamp`   | timestamp | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Timestamp in UTC (given in Grail preferred Linux timestamp nano precision format) when the problem has reopened the last time. A reopen can occur when a problem has resolved, but is not yet closed. If Davis causal AI identified a new event that should be part of the problem, the problem reopens. The field is not set if the problem never reopened. |                                        |
| `dt.davis.mute.status`             | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Status describing if the problem is muted. It is also set to muted when the problem is manually closed.                                                                                                                                                                                                                                                      | `MUTED`                                |
| `dt.davis.mute.user`               | string    | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>User id of the user who muted the event.                                                                                                                                                                                                                                                                                                                     | `donald_duck@gmail.com`                |
| `labels.alerting_profile`          | string[]  | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>A list of alerting profiles that match the problem at the current time.                                                                                                                                                                                                                                                                                      | `[Production, Team DevOps]`            |
| `maintenance.is_under_maintenance` | boolean   | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Indicates if the problem is within a maintenance window.                                                                                                                                                                                                                                                                                                     |                                        |
| `resolved_problem_duration`        | duration  | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>Final duration of the problem in nanoseconds after it was resolved.                                                                                                                                                                                                                                                                                          |                                        |

<!-- endsemconv -->

### Environmental data

This section contains information on entities.

<!-- semconv davis.problem.entities -->
<!-- The content of this table is generated. Please do not edit manually. -->

| Attribute                | Type     | Description                                                                                                                                                                                                                                                 | Examples                              |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `affected_entity_ids`    | string[] | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>A list of all entities that are directly affected. Each element in the list represents a unique entity.                                                                                       | `[HOST-1234567890ABCDEF]`             |
| `affected_entity_types`  | string[] | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>A distinct list of entity types corresponding to the entities listed in 'affected_entity_ids'. The order of elements in this list does not necessarily correspond to the order of entity ids. | `[dt.entity.host, dt.entity.service]` |
| `entity_tags`            | string[] | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>A combined list of all Davis event entity tags.                                                                                                                                               | `[departmentA, department:A]`         |
| `related_entity_ids`     | string[] | ![Experimental](https://img.shields.io/badge/-experimental-orange)<br>A list of all entities that are related to the affected entities. Each element in the list represents a unique entity.                                                                | `[HOST-1234567890ABCDEF]`             |
| `root_cause_entity_id`   | string   | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>The problem root cause entity.                                                                                                                                                                | `HOST-1234567890ABCDEF`               |
| `root_cause_entity_name` | string   | ![Stable](https://img.shields.io/badge/-stable-lightgreen)<br>The name of the problem root cause entity at the time when the problem snapshot was created.                                                                                                  | `Server 1.2.3.4`                      |

<!-- endsemconv -->

<!-- semconv davis.problem.smartscape -->
<!-- The content of this table is generated. Please do not edit manually. -->

| Attribute                          | Type     | Description                                                                                                                                                                                                                                                                       | Examples                  |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `smartscape.affected_entity.ids`   | string[] | ![Experimental](https://img.shields.io/badge/-experimental-orange)<br>A distinct list of all Smartscape IDs that are directly affected. Each element in the list represents a unique Smartscape node.                                                                             | `[HOST-1234567890ABCDEF]` |
| `smartscape.affected_entity.types` | string[] | ![Experimental](https://img.shields.io/badge/-experimental-orange)<br>A distinct list of Smartscape types corresponding to the Smartscape IDs listed in 'smartscape.affected_entity.ids'. The order of elements in this list does not necessarily correspond to the order of IDs. | `[host, service]`         |
| `smartscape.related_entity.ids`    | string[] | ![Experimental](https://img.shields.io/badge/-experimental-orange)<br>A distinct list of all Smartscape IDs that are related to the affected smartscape IDs. Each element in the list represents a unique Smartscape node.                                                        | `[HOST-1234567890ABCDEF]` |
| `smartscape.related_entity.types`  | string[] | ![Experimental](https://img.shields.io/badge/-experimental-orange)<br>A distinct list of Smartscape types corresponding to the Smartscape IDs listed in 'smartscape.related_entity.ids'. The order of elements in this list does not necessarily correspond to the order of IDs.  | `[host, service]`         |

<!-- endsemconv -->
