$ErrorActionPreference = 'Stop'
$raizHealthByte = Split-Path -Parent $PSScriptRoot
Push-Location $raizHealthByte
try {
    $proyectoHealthByte = if ($env:HB_GCP_PROJECT) { $env:HB_GCP_PROJECT } else { 'tu-proyecto-gcp' }
    $cuentaHealthByte = if ($env:HB_GCP_ACCOUNT) { $env:HB_GCP_ACCOUNT } else { 'tu-correo-personal@example.com' }
    $cuentaConfigurada = gcloud config get-value core/account --configuration=healthbyte 2>$null
    if ($LASTEXITCODE -ne 0 -or $cuentaConfigurada.Trim() -ne $cuentaHealthByte) {
        throw "La configuración healthbyte debe usar la cuenta personal $cuentaHealthByte."
    }
    git diff --quiet HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Hay cambios sin commit. Publica y verifica main antes de desplegar.' }
    $fuentesSinCommit = git ls-files --others --exclude-standard -- api web db
    if ($LASTEXITCODE -ne 0 -or $fuentesSinCommit) { throw 'Hay fuentes sin commit. No se despliega un árbol incompleto.' }
    $TAG = git rev-parse --short HEAD
    if ($LASTEXITCODE -ne 0 -or $TAG -notmatch '^[0-9a-f]+$') { throw 'No se pudo obtener el commit.' }
    $env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token --configuration=healthbyte --account=$cuentaHealthByte
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo obtener el token personal.' }
    Remove-Item Env:GOOGLE_CLOUD_QUOTA_PROJECT -ErrorAction SilentlyContinue
    $proyectoEstado = terraform -chdir=infra output -raw proyecto
    if ($LASTEXITCODE -ne 0 -or $proyectoEstado -ne $proyectoHealthByte) { throw "El estado de infra debe pertenecer a $proyectoHealthByte." }
    $versionJev = gcloud secrets versions list jev-api-key --project=$proyectoHealthByte --configuration=healthbyte --account=$cuentaHealthByte --filter=state=ENABLED '--sort-by=~createTime' --limit=1 '--format=value(name)'
    if ($LASTEXITCODE -ne 0 -or !$versionJev) { throw 'Cargue una versión habilitada de jev-api-key directamente en Secret Manager.' }
    $env:TF_VAR_jev_version = ($versionJev -split '/')[-1]
    $bucketFuentes = "${proyectoHealthByte}-web-fuentes"
    gcloud builds submit --config=cloudbuild.yaml --project=$proyectoHealthByte --configuration=healthbyte --account=$cuentaHealthByte "--service-account=projects/$proyectoHealthByte/serviceAccounts/healthbyte-build@$proyectoHealthByte.iam.gserviceaccount.com" "--gcs-source-staging-dir=gs://$bucketFuentes/source" "--substitutions=_REGISTRO=us-east1-docker.pkg.dev/$proyectoHealthByte/healthbyte,_TAG=$TAG"
    if ($LASTEXITCODE -ne 0) { throw 'Cloud Build falló. Se conserva el despliegue anterior.' }
    $env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token --configuration=healthbyte --account=$cuentaHealthByte
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo renovar el token personal.' }
    terraform -chdir=infra plan -input=false -no-color -var "tag=$TAG" '-out=.terraform/despliegue.tfplan'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo validar el plan del despliegue.' }
    $planHealthByte = terraform -chdir=infra show -json '.terraform/despliegue.tfplan' | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inspeccionar el plan.' }
    $borradosHealthByte = @($planHealthByte.resource_changes | Where-Object { $_.change.actions -contains 'delete' })
    if ($borradosHealthByte.Count -gt 0) { throw 'El plan propone borrar recursos. El despliegue automático se detiene.' }
    terraform -chdir=infra apply -var "tag=$TAG" -auto-approve
    if ($LASTEXITCODE -ne 0) { throw 'Terraform no completó el despliegue.' }
    $urlHealthByte = terraform -chdir=infra output -raw web_url
    if ($LASTEXITCODE -ne 0 -or !$urlHealthByte) { throw 'No se obtuvo web_url.' }
    Write-Output "Commit desplegado: $TAG"
    Write-Output "web_url: $urlHealthByte"
} finally {
    Remove-Item Env:GOOGLE_OAUTH_ACCESS_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:TF_VAR_jev_version -ErrorAction SilentlyContinue
    Pop-Location
}
