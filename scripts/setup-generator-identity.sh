#!/usr/bin/env bash
set -euo pipefail
project='sgca-platform-7abbc'
project_number='1076998535653'
repository_id='1234348521'
account='sgca-insight-generator'
pool='sgca-github'
provider='github'
service_account="${account}@${project}.iam.gserviceaccount.com"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project="$project"
if ! gcloud iam service-accounts describe "$service_account" --project="$project" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$account" --display-name='SGCA verified report generator' --project="$project"
fi
permissions='datastore.databases.get,datastore.entities.create,datastore.entities.get,datastore.entities.list'
if gcloud iam roles describe sgcaInsightDraftWriter --project="$project" >/dev/null 2>&1; then
  gcloud iam roles update sgcaInsightDraftWriter --title='SGCA report draft reader and creator' --permissions="$permissions" --stage=GA --project="$project"
else
  gcloud iam roles create sgcaInsightDraftWriter --title='SGCA report draft reader and creator' --permissions="$permissions" --stage=GA --project="$project"
fi
gcloud projects add-iam-policy-binding "$project" --member="serviceAccount:${service_account}" --role="projects/${project}/roles/sgcaInsightDraftWriter" --condition=None --quiet
if ! gcloud iam workload-identity-pools describe "$pool" --location=global --project="$project" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$pool" --location=global --display-name='SGCA GitHub Actions' --project="$project"
fi
condition="assertion.repository_id == '${repository_id}' && assertion.repository_owner_id == '283300781' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'nicesam991003-svg/SGCA-Partners/.github/workflows/weekly-insight.yml@refs/heads/main'"
if gcloud iam workload-identity-pools providers describe "$provider" --workload-identity-pool="$pool" --location=global --project="$project" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "$provider" --workload-identity-pool="$pool" --location=global --issuer-uri='https://token.actions.githubusercontent.com' --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id' --attribute-condition="$condition" --project="$project"
else
  gcloud iam workload-identity-pools providers create-oidc "$provider" --workload-identity-pool="$pool" --location=global --issuer-uri='https://token.actions.githubusercontent.com' --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id' --attribute-condition="$condition" --project="$project"
fi
gcloud iam service-accounts add-iam-policy-binding "$service_account" --role='roles/iam.workloadIdentityUser' --member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${pool}/attribute.repository_id/${repository_id}" --project="$project" --quiet
gcloud iam workload-identity-pools providers describe "$provider" --workload-identity-pool="$pool" --location=global --project="$project" --format='json(name,attributeCondition,state)'
