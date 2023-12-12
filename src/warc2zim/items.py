#!/usr/bin/env python
# -*- coding: utf-8 -*-
# vim: ai ts=4 sts=4 et sw=4 nu

""" warc2zim's item classes

This module contains the differents Item we may want to add to a Zim archive.
"""

import logging
import pkg_resources
from urllib.parse import urlsplit
from libzim.writer import Hint
from zimscraperlib.types import get_mime_for_name
from zimscraperlib.zim.items import StaticItem

from warcio.recordloader import ArcWarcRecord

from warc2zim.utils import get_record_url, get_record_mime_type
from warc2zim.url_rewriting import ArticleUrlRewriter
from warc2zim.content_rewriting import HtmlRewriter, CSSRewriter, JSRewriter

# Shared logger
logger = logging.getLogger("warc2zim.items")


class WARCPayloadItem(StaticItem):
    """WARCPayloadItem used to store the WARC payload
    Usually stored under A namespace
    """

    def __init__(
        self, path: str, record: ArcWarcRecord, head_template: str, css_insert: str
    ):
        super().__init__()
        self.record = record
        self.path = path
        self.mimetype = get_record_mime_type(record)
        self.title = ""

        url_rewriter = ArticleUrlRewriter(self.path)
        if hasattr(self.record, "buffered_stream"):
            self.record.buffered_stream.seek(0)
            self.content = self.record.buffered_stream.read()
        else:
            self.content = self.record.content_stream().read()

        if self.mimetype.startswith("text/html"):
            orig_url_str = get_record_url(record)
            orig_url = urlsplit(orig_url_str)

            wombat_path = url_rewriter.from_normalized("_zim_static/wombat.js")
            head_insert = head_template.render(
                path=path,
                wombat_path=wombat_path,
                orig_url=orig_url_str,
                orig_scheme=orig_url.scheme,
                orig_host=orig_url.netloc,
            )
            self.title, self.content = HtmlRewriter(
                self.path, head_insert, css_insert
            ).rewrite(self.content)
        elif self.mimetype.startswith("text/css"):
            self.content = CSSRewriter(self.path).rewrite(self.content)
        elif "javascript" in self.mimetype:
            self.content = JSRewriter(url_rewriter).rewrite(self.content.decode())

    def get_hints(self):
        is_front = self.mimetype.startswith("text/html")
        return {Hint.FRONT_ARTICLE: is_front}


class StaticArticle(StaticItem):
    def __init__(self, env, filename, main_url, **kwargs):
        super().__init__(**kwargs)
        self.filename = filename
        self.main_url = main_url

        self.mime = get_mime_for_name(filename)
        self.mime = self.mime or "application/octet-stream"

        self.content = pkg_resources.resource_string(
            "warc2zim", "statics/" + filename
        ).decode("utf-8")

    def get_path(self):
        return "_zim_static/" + self.filename

    def get_mimetype(self):
        return self.mime

    def get_hints(self):
        return {Hint.FRONT_ARTICLE: False}
