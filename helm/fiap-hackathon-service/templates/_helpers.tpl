{{/*
Nome curto do serviço (usado em todos os recursos).
*/}}
{{- define "fiap.fullname" -}}
{{- .Values.serviceName | default .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Labels comuns aplicados a todos os recursos.
*/}}
{{- define "fiap.labels" -}}
app.kubernetes.io/name: {{ include "fiap.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
project: fiap-hackathon
{{- end -}}

{{/*
Selector labels (subconjunto que NÃO muda em rolling update).
*/}}
{{- define "fiap.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fiap.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Datadog service tag (default = serviceName).
*/}}
{{- define "fiap.datadogService" -}}
{{- .Values.datadog.service | default (include "fiap.fullname" .) -}}
{{- end -}}
