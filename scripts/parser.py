"""Subscription parser for Clash YAML configurations.

Provides ProxyNode dataclass and SubscriptionParser class
to parse Clash-compatible subscription formats.
"""

import base64
import json
import logging
import re
import urllib.parse
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import yaml

logger = logging.getLogger(__name__)


@dataclass
class ProxyNode:
    """Represents a single proxy node from a parsed subscription.

    Attributes:
        name: Display name of the proxy.
        type: Proxy protocol type (ss, vmess, trojan, vless, socks5, http).
        server: Hostname or IP address.
        port: Remote port.
        latency_ms: Latest measured latency in milliseconds (-1 if unknown).
        speed_mbps: Latest measured speed in Mbps (-1 if unknown).
        raw_config: Original parsed dictionary for this node.
    """

    name: str
    type: str
    server: str
    port: int
    latency_ms: float = -1.0
    speed_mbps: float = -1.0
    raw_config: dict = field(default_factory=dict)


class SubscriptionParser:
    """Parser for subscription content in Clash YAML format."""

    # Supported proxy types
    SUPPORTED_TYPES = {"ss", "vmess", "trojan", "vless", "socks5", "http"}

    # Regex to extract proxy URIs from arbitrary text
    URI_REGEX = re.compile(
        r"(?:ss|vmess|trojan|vless|socks5|https?)://[^\s<>\"']+"
    )

    def parse_clash_yaml(self, content: str) -> List[ProxyNode]:
        """Parse Clash YAML content and return a list of ProxyNode.

        Handles both ``proxies:`` and ``proxy-providers:`` top-level keys.

        Args:
            content: Raw YAML string.

        Returns:
            List of parsed ProxyNode instances. Empty list if content is
            invalid/empty.
        """
        if not content or not content.strip():
            logger.warning("Empty content provided to parse_clash_yaml")
            return []

        try:
            data = yaml.safe_load(content)
        except yaml.YAMLError as exc:
            logger.warning("Failed to parse YAML content: %s", exc)
            return []

        if not isinstance(data, dict):
            logger.warning("YAML root is not a mapping")
            return []

        nodes: List[ProxyNode] = []

        # --- Direct proxies list ---
        raw_proxies = data.get("proxies", [])
        if isinstance(raw_proxies, list):
            for entry in raw_proxies:
                node = self._parse_single_proxy(entry)
                if node is not None:
                    nodes.append(node)

        # --- proxy-providers (flatten all provider lists) ---
        raw_providers = data.get("proxy-providers", {})
        if isinstance(raw_providers, dict):
            for provider_name, provider_value in raw_providers.items():
                if isinstance(provider_value, dict):
                    proxy_list = provider_value.get("proxies", [])
                    if isinstance(proxy_list, list):
                        for entry in proxy_list:
                            node = self._parse_single_proxy(entry)
                            if node is not None:
                                nodes.append(node)

        logger.info("Parsed %d proxy nodes from Clash YAML", len(nodes))
        return nodes

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _parse_single_proxy(self, entry: Any) -> Optional[ProxyNode]:
        """Convert a single YAML proxy entry to a ProxyNode.

        Returns ``None`` if the entry is not a valid mapping or its type
        is unsupported.
        """
        if not isinstance(entry, dict):
            logger.warning("Skipping non-dict proxy entry: %s", entry)
            return None

        proxy_type = entry.get("type", "")
        if proxy_type not in self.SUPPORTED_TYPES:
            logger.warning(
                "Unsupported proxy type '%s' for node '%s'; skipping",
                proxy_type,
                entry.get("name", "<unnamed>"),
            )
            return None

        name = str(entry.get("name", ""))
        server = str(entry.get("server", ""))
        try:
            port = int(entry.get("port", 0))
        except (ValueError, TypeError):
            logger.warning("Invalid port for node '%s'; using 0", name)
            port = 0

        node = ProxyNode(
            name=name,
            type=proxy_type,
            server=server,
            port=port,
            raw_config=dict(entry),
        )

        # Extract type-specific fields into raw_config already captured above
        # (raw_config = full entry dict, so all fields are preserved).
        # Below we just validate expected keys per type via logs.
        self._validate_proxy_entry(node)

        return node

    def _validate_proxy_entry(self, node: ProxyNode) -> None:
        """Emit warnings when type-specific required fields are missing."""
        raw = node.raw_config
        name = node.name
        ptype = node.type

        if ptype == "ss":
            if "cipher" not in raw:
                logger.warning("ss proxy '%s' missing 'cipher'", name)
            if "password" not in raw:
                logger.warning("ss proxy '%s' missing 'password'", name)

        elif ptype == "vmess":
            if "uuid" not in raw:
                logger.warning("vmess proxy '%s' missing 'uuid'", name)

        elif ptype == "trojan":
            if "password" not in raw:
                logger.warning("trojan proxy '%s' missing 'password'", name)

        elif ptype == "vless":
            if "uuid" not in raw:
                logger.warning("vless proxy '%s' missing 'uuid'", name)

        elif ptype == "socks5":
            pass  # username/password are optional for socks5

        elif ptype == "http":
            pass  # username/password are optional for http

    # ------------------------------------------------------------------
    # Base64 / URI parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _fix_base64_padding(data: str) -> str:
        """Add ``=`` padding to base64 string if its length is not a multiple of 4."""
        padding = 4 - len(data) % 4
        if padding != 4:
            data += "=" * padding
        return data

    @staticmethod
    def _decode_base64(data: str) -> str:
        """Decode a base64 string, auto-fixing padding and trying both
        standard and URL-safe alphabets."""
        try:
            return base64.b64decode(
                SubscriptionParser._fix_base64_padding(data)
            ).decode("utf-8")
        except Exception:
            pass
        try:
            return base64.urlsafe_b64decode(
                SubscriptionParser._fix_base64_padding(data)
            ).decode("utf-8")
        except Exception:
            pass
        raise ValueError("Failed to decode base64 content")

    def parse_base64(self, content: str) -> List[ProxyNode]:
        """Parse base64-encoded or plain-text subscription content.

        Auto-detects whether *content* is Base64-encoded or already plain
        text containing ``ss://``, ``vmess://`` etc. URIs.  Extracts all
        valid URIs and routes each to the appropriate scheme-specific
        parser.

        Args:
            content: Raw subscription response body.

        Returns:
            List of parsed :class:`ProxyNode` instances.
        """
        if not content or not content.strip():
            logger.warning("Empty content provided to parse_base64")
            return []

        text = content.strip()

        # Try to decode as base64 first
        try:
            decoded = self._decode_base64(text)
            logger.debug("Content decoded as base64 (%d bytes)", len(decoded))
            text = decoded
        except Exception:
            # Not valid base64 — treat as plain text
            logger.debug("Content is not valid base64; treating as plain text")

        uris = self._try_extract_uris(text)
        if not uris:
            logger.warning("No proxy URIs found in content")
            return []

        nodes: List[ProxyNode] = []
        for uri in uris:
            try:
                node = self._parse_uri(uri)
                if node is not None:
                    nodes.append(node)
            except Exception as exc:
                logger.warning("Failed to parse URI '%s': %s", uri[:60], exc)

        logger.info("Parsed %d proxy nodes from base64/URI content", len(nodes))
        return nodes

    def _try_extract_uris(self, text: str) -> List[str]:
        """Extract all proxy protocol URIs from *text* via regex.

        Returns an ordered list of unique URI strings found in the text.
        """
        if not text:
            return []
        # Remove duplicates while preserving order
        seen: set = set()
        uris: List[str] = []
        for m in self.URI_REGEX.finditer(text):
            uri = m.group(0).rstrip("/")
            if uri not in seen:
                seen.add(uri)
                uris.append(uri)
        return uris

    def _parse_uri(self, uri: str) -> Optional[ProxyNode]:
        """Route a proxy URI to the appropriate scheme-specific parser."""
        scheme = uri.split("://", 1)[0].lower()

        if scheme == "ss":
            return self._parse_ss_uri(uri)
        elif scheme == "vmess":
            return self._parse_vmess_uri(uri)
        elif scheme == "trojan":
            return self._parse_trojan_uri(uri)
        elif scheme == "vless":
            return self._parse_vless_uri(uri)
        elif scheme == "socks5":
            return self._parse_socks5_uri(uri)
        elif scheme in ("http", "https"):
            return self._parse_http_uri(uri)
        else:
            logger.warning("Unsupported URI scheme '%s' in '%s'", scheme, uri[:60])
            return None

    # ------------------------------------------------------------------
    # Scheme-specific URI parsers
    # ------------------------------------------------------------------

    def _parse_ss_uri(self, uri: str) -> Optional[ProxyNode]:
        """Parse a ``ss://`` URI.

        Supports two common formats:

        * Standard (with ``@``)::

            ss://BASE64(method:password)@server:port#name

        * SIP002 full-encoded::

            ss://BASE64(method:password@server:port)#name
        """
        rest = uri[len("ss://"):]

        # Strip trailing slash before any query
        if "?" not in rest:
            rest = rest.rstrip("/")

        # --- Standard format: contains '@' (userinfo@host) ---
        if "@" in rest:
            userinfo_b64, remainder = rest.split("@", 1)

            try:
                userinfo = self._decode_base64(userinfo_b64)
            except Exception:
                logger.warning("ss: failed to decode userinfo base64 in '%s'", uri[:60])
                return None

            if ":" not in userinfo:
                logger.warning("ss: malformed userinfo '%s' in '%s'", userinfo, uri[:60])
                return None
            method, password = userinfo.split(":", 1)

            # Separate query params, fragment, and server:port
            query_params: Dict[str, List[str]] = {}
            fragment = ""
            server_part = remainder

            if "#" in server_part:
                server_part, fragment = server_part.rsplit("#", 1)

            if "?" in server_part:
                server_part, qs = server_part.split("?", 1)
                query_params = urllib.parse.parse_qs(qs)

            # Parse server:port
            if ":" not in server_part:
                logger.warning("ss: missing port in '%s'", uri[:60])
                return None
            server, port_str = server_part.rsplit(":", 1)
            try:
                port = int(port_str)
            except ValueError:
                logger.warning("ss: invalid port '%s' in '%s'", port_str, uri[:60])
                return None

            name = fragment or server
            plugin = query_params.get("plugin", [None])[0]

            raw_config: Dict[str, Any] = {
                "method": method,
                "password": password,
            }
            if plugin:
                raw_config["plugin"] = plugin

            return ProxyNode(
                name=name,
                type="ss",
                server=server,
                port=port,
                raw_config=raw_config,
            )

        # --- SIP002 full-encoded format (everything after ``ss://`` is base64) ---
        try:
            decoded = self._decode_base64(rest)
        except Exception:
            logger.warning("ss: failed to decode SIP002 base64 in '%s'", uri[:60])
            return None

        # decoded is now ``method:password@server:port`` possibly with ``#name``
        if "@" not in decoded:
            logger.warning("ss: malformed SIP002 payload '%s' in '%s'", decoded, uri[:60])
            return None

        userinfo_part, host_part = decoded.split("@", 1)
        if ":" not in userinfo_part:
            logger.warning("ss: missing method:password in SIP002 '%s'", uri[:60])
            return None
        method, password = userinfo_part.split(":", 1)

        fragment = ""
        if "#" in host_part:
            host_part, fragment = host_part.rsplit("#", 1)

        server, port_str = host_part.rsplit(":", 1)
        try:
            port = int(port_str)
        except ValueError:
            logger.warning("ss: invalid SIP002 port '%s' in '%s'", port_str, uri[:60])
            return None

        name = fragment or server
        return ProxyNode(
            name=name,
            type="ss",
            server=server,
            port=port,
            raw_config={"method": method, "password": password},
        )

    def _parse_vmess_uri(self, uri: str) -> Optional[ProxyNode]:
        """Parse a ``vmess://`` URI (V2RayN JSON format).

        Format::

            vmess://BASE64({"add":"server","port":443,"id":"uuid","ps":"name",...})
        """
        rest = uri[len("vmess://"):]

        try:
            json_str = self._decode_base64(rest)
        except Exception:
            logger.warning("vmess: failed to decode base64 in '%s'", uri[:60])
            return None

        try:
            config = json.loads(json_str)
        except json.JSONDecodeError as exc:
            logger.warning("vmess: failed to parse JSON: %s", exc)
            return None

        if not isinstance(config, dict):
            logger.warning("vmess: decoded JSON is not an object in '%s'", uri[:60])
            return None

        server = config.get("add", "") or config.get("host", "")
        port_raw = config.get("port", 0)
        try:
            port = int(port_raw)
        except (ValueError, TypeError):
            logger.warning("vmess: invalid port '%s'", port_raw)
            port = 0
        name = config.get("ps", "") or server

        return ProxyNode(
            name=name,
            type="vmess",
            server=server,
            port=port,
            raw_config=dict(config),
        )

    def _parse_trojan_uri(self, uri: str) -> Optional[ProxyNode]:
        """Parse a ``trojan://`` URI.

        Format::

            trojan://password@server:port?tls=1&sni=example.com#name
        """
        # urllib.parse cannot handle ``password@host`` in ``trojan://`` if
        # the password has special characters, but we still use it for the
        # robust query-string parsing.
        parsed = urllib.parse.urlparse(uri)

        password = parsed.username or ""
        server = parsed.hostname or ""
        fragment = parsed.fragment or ""
        port = parsed.port or 443
        name = fragment or server

        query = urllib.parse.parse_qs(parsed.query)

        raw_config: Dict[str, Any] = {
            "password": password,
        }
        # Optional well-known query parameters
        for key in ("sni", "tls", "allowInsecure", "alpn", "flow"):
            val = query.get(key, [None])[0]
            if val is not None:
                raw_config[key] = val

        return ProxyNode(
            name=name,
            type="trojan",
            server=server,
            port=port,
            raw_config=raw_config,
        )

    def _parse_vless_uri(self, uri: str) -> Optional[ProxyNode]:
        """Parse a ``vless://`` URI.

        Format::

            vless://uuid@server:port?tls=1&sni=example.com&path=%2Fws#name
        """
        parsed = urllib.parse.urlparse(uri)

        uuid = parsed.username or ""
        server = parsed.hostname or ""
        fragment = parsed.fragment or ""
        port = parsed.port or 443
        name = fragment or server

        query = urllib.parse.parse_qs(parsed.query)

        raw_config: Dict[str, Any] = {
            "uuid": uuid,
        }
        for key in (
            "encryption",
            "flow",
            "sni",
            "tls",
            "allowInsecure",
            "alpn",
            "type",
            "headerType",
            "host",
            "path",
            "serviceName",
            "mode",
            "security",
            "pbk",
            "sid",
            "spx",
        ):
            val = query.get(key, [None])[0]
            if val is not None:
                raw_config[key] = val

        return ProxyNode(
            name=name,
            type="vless",
            server=server,
            port=port,
            raw_config=raw_config,
        )

    def _parse_socks5_uri(self, uri: str) -> Optional[ProxyNode]:
        """Parse a ``socks5://`` URI.

        Format::

            socks5://user:password@server:port#name
        """
        parsed = urllib.parse.urlparse(uri)

        server = parsed.hostname or ""
        port = parsed.port or 1080
        name = parsed.fragment or server

        raw_config: Dict[str, Any] = {}
        if parsed.username:
            raw_config["username"] = parsed.username
        if parsed.password:
            raw_config["password"] = parsed.password

        return ProxyNode(
            name=name,
            type="socks5",
            server=server,
            port=port,
            raw_config=raw_config,
        )

    def _parse_http_uri(self, uri: str) -> Optional[ProxyNode]:
        """Parse an ``http://`` or ``https://`` proxy URI.

        Format::

            http://user:password@server:port#name
        """
        parsed = urllib.parse.urlparse(uri)

        server = parsed.hostname or ""
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        name = parsed.fragment or server

        raw_config: Dict[str, Any] = {}
        if parsed.username:
            raw_config["username"] = parsed.username
        if parsed.password:
            raw_config["password"] = parsed.password

        return ProxyNode(
            name=name,
            type="http",
            server=server,
            port=port,
            raw_config=raw_config,
        )
