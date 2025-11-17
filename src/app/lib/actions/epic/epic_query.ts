export const EPIC_QUERY = `query EpicsAsWorkItem($groupFullPath: ID!, $workItemIID: String!) {
  group(fullPath: $groupFullPath) {
    workItem(iid: $workItemIID) {
      id
      title
      description
      createdAt
      closedAt
      widgets {
        ... on WorkItemWidgetHierarchy {
          parent {
            title
            description
          }
          children {
            nodes {
              iid
              id
              title
              description
              state
              workItemType {
                name
              }
              project {
                id
              }
              widgets {
                ... on WorkItemWidgetMilestone {
                  milestone {
                    title
                  }
                }
              }
            }
          }
        }
        ... on WorkItemWidgetNotes {
          discussions {
            nodes {
              notes {
                edges {
                  node {
                    body
                    id
                    author {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`

export const MUTATE_EPIC_DESCRIPTION = `mutation updateEpicWorkItemWithWidgets($workItemId: WorkItemID!, $description: String!) {
  workItemUpdate(
    input: {
      id: $workItemId
      descriptionWidget: { description: $description }
    }
  ) {
    workItem {
      id
      title
      description
    }
  }
}`

