"""Importa manchetes Pokemon do RSS para o forum. Somente biblioteca padrao."""
import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser

FEED_URL = "https://www.nintendolife.com/feeds/news"
USER_AGENT = "PokeatlasNews/1.0 (+https://github.com/Naglivers/PokedexApp)"
ARTICLE_PATH = re.compile(r"/news/[0-9]{4}/[0-9]{2}/[a-zA-Z0-9_-]+")
TOPIC = re.compile(r"\b(pokemon|pokedex|pokopia|tcg pocket)\b", re.I)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise RuntimeError("Redirecionamento inesperado; importacao interrompida.")


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.blocked = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.blocked += 1
        if tag in ("p", "br", "div", "li"):
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.blocked = max(0, self.blocked - 1)
        if tag in ("p", "div", "li"):
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.blocked:
            self.parts.append(data)


def text_only(value):
    parser = PlainText()
    parser.feed(value or "")
    value = html.unescape(" ".join(parser.parts))
    return " ".join("".join(c for c in value if c.isprintable() or c.isspace()).split())


def shorten(value, limit, words=None):
    if words:
        value = " ".join(value.split()[:words])
    if len(value) <= limit:
        return value
    return value[:limit - 1].rsplit(" ", 1)[0].rstrip() + "…"


def normalized(value):
    return "".join(c for c in unicodedata.normalize("NFKD", value)
                   if not unicodedata.combining(c)).lower()


def read_url(url, *, payload=None, headers=None, max_bytes=1048576):
    request = urllib.request.Request(
        url,
        data=payload,
        headers={"User-Agent": USER_AGENT, **(headers or {})},
        method="POST" if payload is not None else "GET",
    )
    opener = urllib.request.build_opener(NoRedirect())
    for attempt in range(3):
        try:
            with opener.open(request, timeout=20) as response:
                data = response.read(max_bytes + 1)
                if len(data) > max_bytes:
                    raise RuntimeError("Resposta acima do tamanho permitido.")
                return data
        except urllib.error.HTTPError as error:
            if (error.code == 429 or error.code >= 500) and attempt < 2:
                time.sleep(2 ** (attempt + 1))
                continue
            # Nao imprime respostas, tokens, cabecalhos ou corpo da requisicao.
            raise RuntimeError("Servico respondeu HTTP " + str(error.code) +
                               ". Confira o feed, a query 011 e os Secrets.") from None
        except (urllib.error.URLError, TimeoutError, OSError):
            if attempt < 2:
                time.sleep(2 ** (attempt + 1))
                continue
            raise RuntimeError("Falha de conexao ao consultar o servico.") from None


def canonical_article(value):
    try:
        url = urllib.parse.urlsplit(value.strip())
        if (url.scheme != "https" or
                url.hostname not in ("www.nintendolife.com", "nintendolife.com") or
                url.username or url.password or url.port not in (None, 443)):
            return None
        path = url.path.rstrip("/")
        if not ARTICLE_PATH.fullmatch(path):
            return None
        return "https://www.nintendolife.com" + path
    except ValueError:
        return None


def child_text(element, name):
    for child in element:
        if child.tag.rsplit("}", 1)[-1] == name:
            return "".join(child.itertext()).strip()
    return ""



class MediaParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.image = None
        self.video = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("property") == "og:image" and not self.image:
            self.image = media_url(attrs.get("content", ""), "image")
        if tag == "img" and not self.image:
            self.image = media_url(attrs.get("src", ""), "image")
        if tag in ("iframe", "video", "source", "a") and not self.video:
            self.video = media_url(attrs.get("src", attrs.get("href", "")), "video")


def media_url(value, kind):
    try:
        url = urllib.parse.urlsplit(html.unescape(value))
        if url.scheme != "https" or url.username or url.password or url.port not in (None, 443):
            return None
        host = (url.hostname or "").lower()
        if kind == "image" and (host == "images.nintendolife.com" or host.endswith(".nintendolife.com")):
            return urllib.parse.urlunsplit(("https", host, url.path, url.query, ""))
        if kind == "video":
            if host in ("www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"):
                match = re.fullmatch(r"/(?:embed|shorts)/([A-Za-z0-9_-]{11})", url.path)
                video_id = match.group(1) if match else urllib.parse.parse_qs(url.query).get("v", [""])[0]
            elif host == "youtu.be":
                video_id = url.path.strip("/")
            else:
                return None
            if re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
                return "https://www.youtube.com/watch?v=" + video_id
    except ValueError:
        pass
    return None


def read_media(item, article_url):
    parser = MediaParser()
    for node in item.iter():
        local = node.tag.rsplit("}", 1)[-1]
        if local in ("description", "encoded"):
            parser.feed("".join(node.itertext()))
        candidate = node.attrib.get("url", "")
        if local in ("content", "thumbnail", "enclosure"):
            if not parser.image:
                parser.image = media_url(candidate, "image")
            if not parser.video:
                parser.video = media_url(candidate, "video")
    if not parser.image or not parser.video:
        try:
            # Apenas metadados de mídia; nunca importa o texto da matéria.
            parser.feed(read_url(article_url).decode("utf-8", errors="replace"))
        except (RuntimeError, ValueError):
            pass
    return {"image_url": parser.image, "video_url": parser.video}


def read_entries():
    payload = read_url(FEED_URL)
    upper = payload.upper()
    if b"<!DOCTYPE" in upper or b"<!ENTITY" in upper:
        raise RuntimeError("O feed contem declaracoes XML nao permitidas.")
    try:
        root = ET.fromstring(payload)
    except ET.ParseError:
        raise RuntimeError("O feed retornou XML invalido.") from None
    if root.tag.rsplit("}", 1)[-1] != "rss":
        raise RuntimeError("O endereco nao retornou um feed RSS.")
    now = datetime.now(timezone.utc)
    entries = {}
    for item in root.iter("item"):
        title = shorten(text_only(child_text(item, "title")), 140)
        if len(title) < 4 or not TOPIC.search(normalized(title)):
            continue
        link = canonical_article(child_text(item, "link"))
        if not link:
            continue
        try:
            published = parsedate_to_datetime(child_text(item, "pubDate"))
            if published.tzinfo is None:
                continue
            published = published.astimezone(timezone.utc)
        except (ValueError, TypeError, OverflowError):
            continue
        if published < now - timedelta(days=7) or published > now + timedelta(hours=1):
            continue
        summary = shorten(text_only(child_text(item, "description")), 180, words=25)
        if len(summary) < 10:
            summary = ("Nova noticia de Pokemon publicada no Nintendo Life. "
                       "Confira os detalhes na materia original.")
        entries[link] = {
            "title": title,
            "summary": summary,
            "url": link,
            "published_at": published.isoformat(),
            **read_media(item, link),
        }
    return sorted(entries.values(), key=lambda item: item["published_at"])[-20:]


def configuration():
    raw_url = (os.getenv("SUPABASE_URL") or "").strip()
    public_key = (os.getenv("SUPABASE_PUBLISHABLE_KEY") or "").strip()
    import_token = (os.getenv("SUPABASE_NEWS_IMPORT_TOKEN") or "").strip()
    if not raw_url or not public_key or not import_token:
        raise RuntimeError(
            "Cadastre SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e "
            "SUPABASE_NEWS_IMPORT_TOKEN nos Secrets do GitHub Actions."
        )
    try:
        url = urllib.parse.urlsplit(raw_url)
        if (url.scheme != "https" or not url.hostname or url.username or
                url.password or url.query or url.fragment or
                url.path not in ("", "/") or url.port not in (None, 443)):
            raise ValueError()
    except ValueError:
        raise RuntimeError("SUPABASE_URL deve ser a URL HTTPS do projeto.") from None
    if public_key.startswith("sb_secret_"):
        raise RuntimeError("Use a chave publica publishable, nao a chave secret.")
    if not re.fullmatch(r"[a-f0-9]{64}", import_token):
        raise RuntimeError("A chave de importacao deve ser o token gerado pela query 011.")
    return raw_url.rstrip("/"), public_key, import_token


def main():
    base_url, public_key, import_token = configuration()
    entries = read_entries()
    if not entries:
        print("Nenhuma noticia Pokemon recente no recorte atual do feed.")
        return
    body = json.dumps({"p_import_token": import_token, "p_entries": entries},
                      ensure_ascii=False).encode("utf-8")
    raw = read_url(
        base_url + "/rest/v1/rpc/pokeatlas_forum_import_news",
        payload=body,
        headers={"apikey": public_key, "Content-Type": "application/json"},
        max_bytes=65536,
    )
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise RuntimeError("O Supabase retornou uma resposta invalida.") from None
    if not isinstance(result, dict) or result.get("ok") is not True:
        code = result.get("code") if isinstance(result, dict) else None
        code = code if isinstance(code, str) and re.fullmatch(r"[a-z_]{1,32}", code) else "network"
        raise RuntimeError("Importacao recusada pelo banco: " + code +
                           ". Confira a query 011 e o Secret de importacao.")
    if result.get("disabled") is True:
        print("A importacao esta desativada no Supabase.")
        return
    imported = result.get("imported")
    if not isinstance(imported, int) or isinstance(imported, bool) or not 0 <= imported <= len(entries):
        raise RuntimeError("O Supabase retornou uma contagem de importacao invalida.")
    print(str(imported) + " noticia(s) publicada(s); " +
          str(len(entries) - imported) + " ja importada(s).")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
