FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Rct.Api.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0

# curl für den Docker-Healthcheck (GET /health).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Ubuntu-24.04-Basis (.NET 10) hat kein adduser mehr — useradd nutzen
RUN useradd --no-create-home appuser

WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
USER appuser
ENTRYPOINT ["dotnet", "Rct.Api.dll"]
