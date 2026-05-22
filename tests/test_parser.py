"""Tests for scripts.parser — YAML, Base64, and URI parsing."""

import base64
import json
from dataclasses import asdict

import pytest
import yaml

from scripts.parser import ProxyNode, SubscriptionParser


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def parser() -> SubscriptionParser:
    return SubscriptionParser()


# ---------------------------------------------------------------------------
# ProxyNode dataclass defaults
# ---------------------------------------------------------------------------

class TestProxyNodeDefaults:
    """Verify ProxyNode dataclass default values."""

    def test_defaults(self) -> None:
        node = ProxyNode(name="n", type="ss", server="s", port=1)
        assert node.latency_ms == -1.0
        assert node.speed_mbps == -1.0
        assert node.raw_config == {}

    def test_explicit_values(self) -> None:
        node = ProxyNode(
            name="n", type="ss", server="s", port=1,
            latency_ms=100.0, speed_mbps=50.0,
            raw_config={"method": "chacha20"},
        )
        assert node.latency_ms == 100.0
        assert node.speed_mbps == 50.0
        assert node.raw_config == {"method": "chacha20"}


# ---------------------------------------------------------------------------
# Clash YAML parsing
# ---------------------------------------------------------------------------

class TestClashYaml:
    """parse_clash_yaml behaviour."""

    def test_valid_yaml(self, parser: SubscriptionParser) -> None:
        yaml_text = yaml.dump({
            "proxies": [
                {
                    "name": "🇯🇵 JP-01",
                    "type": "ss",
                    "server": "jp1.example.com",
                    "port": 443,
                    "cipher": "aes-256-gcm",
                    "password": "sekret1",
                },
                {
                    "name": "🇺🇸 US-01",
                    "type": "vmess",
                    "server": "us1.example.com",
                    "port": 8443,
                    "uuid": "abc-def-ghi",
                },
            ],
        })
        nodes = parser.parse_clash_yaml(yaml_text)
        assert len(nodes) == 2

        # First node: ss
        assert nodes[0].name == "🇯🇵 JP-01"
        assert nodes[0].type == "ss"
        assert nodes[0].server == "jp1.example.com"
        assert nodes[0].port == 443
        assert nodes[0].raw_config["cipher"] == "aes-256-gcm"
        assert nodes[0].raw_config["password"] == "sekret1"

        # Second node: vmess
        assert nodes[1].name == "🇺🇸 US-01"
        assert nodes[1].type == "vmess"
        assert nodes[1].server == "us1.example.com"
        assert nodes[1].port == 8443
        assert nodes[1].raw_config["uuid"] == "abc-def-ghi"

    def test_empty_content(self, parser: SubscriptionParser) -> None:
        assert parser.parse_clash_yaml("") == []
        assert parser.parse_clash_yaml("   ") == []
        assert parser.parse_clash_yaml("\n\n") == []

    def test_invalid_yaml(self, parser: SubscriptionParser) -> None:
        assert parser.parse_clash_yaml("{{{{broken: ") == []

    def test_non_mapping_root(self, parser: SubscriptionParser) -> None:
        assert parser.parse_clash_yaml("hello") == []
        assert parser.parse_clash_yaml("[]") == []

    def test_empty_proxies_list(self, parser: SubscriptionParser) -> None:
        text = yaml.dump({"proxies": []})
        assert parser.parse_clash_yaml(text) == []

    def test_proxy_providers_flattened(self, parser: SubscriptionParser) -> None:
        """proxy-providers are flattened into the same result list."""
        text = yaml.dump({
            "proxy-providers": {
                "provider_a": {
                    "proxies": [
                        {"name": "A1", "type": "ss", "server": "a1.com", "port": 80},
                    ],
                },
                "provider_b": {
                    "proxies": [
                        {"name": "B1", "type": "ss", "server": "b1.com", "port": 443},
                    ],
                },
            },
        })
        nodes = parser.parse_clash_yaml(text)
        assert len(nodes) == 2

    def test_unsupported_type_skipped(self, parser: SubscriptionParser) -> None:
        text = yaml.dump({
            "proxies": [
                {"name": "good", "type": "ss", "server": "s", "port": 1},
                {"name": "bad", "type": "unknown", "server": "x", "port": 2},
            ],
        })
        nodes = parser.parse_clash_yaml(text)
        assert len(nodes) == 1
        assert nodes[0].name == "good"

    def test_non_dict_entry_skipped(self, parser: SubscriptionParser) -> None:
        text = yaml.dump({"proxies": ["just a string"]})
        nodes = parser.parse_clash_yaml(text)
        assert nodes == []

    def test_invalid_port_defaults_to_zero(self, parser: SubscriptionParser) -> None:
        text = yaml.dump({
            "proxies": [
                {"name": "n", "type": "ss", "server": "s", "port": "not-a-number"},
            ],
        })
        nodes = parser.parse_clash_yaml(text)
        assert len(nodes) == 1
        assert nodes[0].port == 0


# ---------------------------------------------------------------------------
# URI parsing — SS
# ---------------------------------------------------------------------------

class TestSSUri:
    """_parse_ss_uri — both standard and SIP002 formats."""

    def test_standard_format(self, parser: SubscriptionParser) -> None:
        """ss://BASE64(method:password)@server:port#name"""
        userinfo = base64.b64encode(b"aes-256-gcm:sekret").decode()
        uri = f"ss://{userinfo}@jp1.example.com:443#JP-01"
        node = parser._parse_ss_uri(uri)
        assert node is not None
        assert node.type == "ss"
        assert node.server == "jp1.example.com"
        assert node.port == 443
        assert node.name == "JP-01"
        assert node.raw_config["method"] == "aes-256-gcm"
        assert node.raw_config["password"] == "sekret"

    def test_standard_format_with_plugin(self, parser: SubscriptionParser) -> None:
        userinfo = base64.b64encode(b"chacha20:pass").decode()
        uri = f"ss://{userinfo}@s.example.com:1234?plugin=v2ray-plugin%3Bobfs%3Dws"
        node = parser._parse_ss_uri(uri)
        assert node is not None
        assert node.server == "s.example.com"
        assert node.port == 1234
        assert "plugin" in node.raw_config

    def test_sip002_format(self, parser: SubscriptionParser) -> None:
        """ss://BASE64(method:password@server:port) — SIP002 without fragment."""
        payload = base64.b64encode(b"chacha20:pass@s.example.com:443").decode()
        uri = f"ss://{payload}"
        node = parser._parse_ss_uri(uri)
        assert node is not None
        assert node.server == "s.example.com"
        assert node.port == 443
        assert node.name == "s.example.com"  # falls back to server when no fragment
        assert node.raw_config["method"] == "chacha20"
        assert node.raw_config["password"] == "pass"

    def test_malformed_returns_none(self, parser: SubscriptionParser) -> None:
        assert parser._parse_ss_uri("ss://invalid") is None


# ---------------------------------------------------------------------------
# URI parsing — VMess
# ---------------------------------------------------------------------------

class TestVMessUri:
    """_parse_vmess_uri — Base64-encoded JSON."""

    def test_vmess(self, parser: SubscriptionParser) -> None:
        cfg = {
            "add": "us1.example.com",
            "port": 8888,
            "id": "uuid-1234",
            "ps": "US-VMESS",
            "aid": "0",
            "net": "ws",
            "path": "/ws",
        }
        b64 = base64.b64encode(json.dumps(cfg, separators=(",", ":")).encode()).decode()
        uri = f"vmess://{b64}"
        node = parser._parse_vmess_uri(uri)
        assert node is not None
        assert node.type == "vmess"
        assert node.server == "us1.example.com"
        assert node.port == 8888
        assert node.name == "US-VMESS"
        assert node.raw_config["id"] == "uuid-1234"

    def test_vmess_fallback_name(self, parser: SubscriptionParser) -> None:
        """When ps is missing, name falls back to server."""
        cfg = {"add": "s.example.com", "port": 443, "id": "x"}
        b64 = base64.b64encode(json.dumps(cfg).encode()).decode()
        node = parser._parse_vmess_uri(f"vmess://{b64}")
        assert node is not None
        assert node.name == "s.example.com"

    def test_invalid_base64(self, parser: SubscriptionParser) -> None:
        assert parser._parse_vmess_uri("vmess://!!!not-base64!!") is None

    def test_invalid_json(self, parser: SubscriptionParser) -> None:
        b64 = base64.b64encode(b"not json").decode()
        assert parser._parse_vmess_uri(f"vmess://{b64}") is None


# ---------------------------------------------------------------------------
# URI parsing — Trojan
# ---------------------------------------------------------------------------

class TestTrojanUri:
    """_parse_trojan_uri — password@host with query params."""

    def test_trojan(self, parser: SubscriptionParser) -> None:
        uri = "trojan://my-pass@t.example.com:443?tls=1&sni=sni.example.com#TROJAN-01"
        node = parser._parse_trojan_uri(uri)
        assert node is not None
        assert node.type == "trojan"
        assert node.server == "t.example.com"
        assert node.port == 443
        assert node.name == "TROJAN-01"
        assert node.raw_config["password"] == "my-pass"
        assert node.raw_config["sni"] == "sni.example.com"
        assert node.raw_config["tls"] == "1"

    def test_trojan_default_port(self, parser: SubscriptionParser) -> None:
        node = parser._parse_trojan_uri("trojan://pass@t.example.com")
        assert node is not None
        assert node.port == 443

    def test_trojan_no_fragment(self, parser: SubscriptionParser) -> None:
        node = parser._parse_trojan_uri("trojan://pass@t.example.com:1234")
        assert node is not None
        assert node.name == "t.example.com"


# ---------------------------------------------------------------------------
# URI parsing — VLESS
# ---------------------------------------------------------------------------

class TestVlessUri:
    """_parse_vless_uri — uuid@host with query params."""

    def test_vless(self, parser: SubscriptionParser) -> None:
        uri = (
            "vless://my-uuid@v.example.com:2053"
            "?tls=1&sni=sni.example.com&path=%2Fws&flow=xtls-rprx-vision"
            "#VLESS-01"
        )
        node = parser._parse_vless_uri(uri)
        assert node is not None
        assert node.type == "vless"
        assert node.server == "v.example.com"
        assert node.port == 2053
        assert node.name == "VLESS-01"
        assert node.raw_config["uuid"] == "my-uuid"
        assert node.raw_config["sni"] == "sni.example.com"
        assert node.raw_config["path"] == "/ws"
        assert node.raw_config["flow"] == "xtls-rprx-vision"
        assert node.raw_config["tls"] == "1"

    def test_vless_default_port(self, parser: SubscriptionParser) -> None:
        node = parser._parse_vless_uri("vless://uuid@v.example.com")
        assert node is not None
        assert node.port == 443


# ---------------------------------------------------------------------------
# URI parsing — SOCKS5
# ---------------------------------------------------------------------------

class TestSocks5Uri:
    """_parse_socks5_uri — with optional auth."""

    def test_socks5_with_auth(self, parser: SubscriptionParser) -> None:
        uri = "socks5://user:pass@s5.example.com:1080#SOCKS-01"
        node = parser._parse_socks5_uri(uri)
        assert node is not None
        assert node.type == "socks5"
        assert node.server == "s5.example.com"
        assert node.port == 1080
        assert node.name == "SOCKS-01"
        assert node.raw_config["username"] == "user"
        assert node.raw_config["password"] == "pass"

    def test_socks5_no_auth(self, parser: SubscriptionParser) -> None:
        uri = "socks5://s5.example.com:1080"
        node = parser._parse_socks5_uri(uri)
        assert node is not None
        assert node.port == 1080
        # no username/password in raw_config when not provided
        assert "username" not in node.raw_config
        assert "password" not in node.raw_config

    def test_socks5_default_port(self, parser: SubscriptionParser) -> None:
        node = parser._parse_socks5_uri("socks5://s5.example.com")
        assert node is not None
        assert node.port == 1080


# ---------------------------------------------------------------------------
# URI parsing — HTTP / HTTPS
# ---------------------------------------------------------------------------

class TestHttpUri:
    """_parse_http_uri — with optional auth."""

    def test_http_with_auth(self, parser: SubscriptionParser) -> None:
        uri = "http://user:pass@h.example.com:3128#HTTP-01"
        node = parser._parse_http_uri(uri)
        assert node is not None
        assert node.type == "http"
        assert node.server == "h.example.com"
        assert node.port == 3128
        assert node.name == "HTTP-01"
        assert node.raw_config["username"] == "user"
        assert node.raw_config["password"] == "pass"

    def test_https_default_port(self, parser: SubscriptionParser) -> None:
        node = parser._parse_http_uri("https://h.example.com")
        assert node is not None
        assert node.port == 443

    def test_http_default_port(self, parser: SubscriptionParser) -> None:
        node = parser._parse_http_uri("http://h.example.com")
        assert node is not None
        assert node.port == 80


# ---------------------------------------------------------------------------
# Base64 / URI subscription parsing
# ---------------------------------------------------------------------------

class TestParseBase64:
    """parse_base64 — auto-detect and route URIs."""

    def test_base64_encoded_uris(self, parser: SubscriptionParser) -> None:
        """Plain-text URIs encoded in base64 are decoded and parsed."""
        plain = "ss://YWVzLTI1Ni1nY206cGFzcw==@s.example.com:443#SS-01\n"
        encoded = base64.b64encode(plain.encode()).decode()
        nodes = parser.parse_base64(encoded)
        assert len(nodes) == 1
        assert nodes[0].type == "ss"
        assert nodes[0].name == "SS-01"

    def test_plain_text_uris(self, parser: SubscriptionParser) -> None:
        text = (
            "ss://YWVzLTI1Ni1nY206cGFzc3M=@s1.example.com:443#S1\n"
            "trojan://pw@s2.example.com:8443#S2\n"
        )
        nodes = parser.parse_base64(text)
        assert len(nodes) == 2
        assert nodes[0].type == "ss"
        assert nodes[1].type == "trojan"

    def test_empty_content(self, parser: SubscriptionParser) -> None:
        assert parser.parse_base64("") == []
        assert parser.parse_base64("   ") == []
        assert parser.parse_base64("\n") == []

    def test_no_uris_found(self, parser: SubscriptionParser) -> None:
        assert parser.parse_base64("just some random text") == []

    def test_mixed_valid_and_invalid_uris(self, parser: SubscriptionParser) -> None:
        """Invalid URIs are skipped; valid ones are still returned."""
        text = (
            "ss://YWVzLTI1Ni1nY206cGFzcw==@s.example.com:443#OK\n"
            "vmess://!!!invalid-base64!!\n"
        )
        nodes = parser.parse_base64(text)
        assert len(nodes) == 1
        assert nodes[0].name == "OK"


# ---------------------------------------------------------------------------
# Routing via _parse_uri
# ---------------------------------------------------------------------------

class TestParseUri:
    """_parse_uri dispatches to the correct scheme parser."""

    def test_unsupported_scheme(self, parser: SubscriptionParser) -> None:
        assert parser._parse_uri("unknown://foo@bar.com:80") is None

    def test_ss_routing(self, parser: SubscriptionParser) -> None:
        node = parser._parse_uri("ss://Y Q@x:1")
        # malformed SS returns None (not crashes)
        assert node is None


# ---------------------------------------------------------------------------
# URI regex extraction
# ---------------------------------------------------------------------------

class TestExtractUris:
    """_try_extract_uris deduplication and boundary detection."""

    def test_deduplicates(self, parser: SubscriptionParser) -> None:
        text = (
            "ss://a@x.com:1#A\n"
            "ss://a@x.com:1#A\n"  # duplicate
            "ss://b@y.com:2#B\n"
        )
        uris = parser._try_extract_uris(text)
        assert len(uris) == 2

    def test_empty_text(self, parser: SubscriptionParser) -> None:
        assert parser._try_extract_uris("") == []
        assert parser._try_extract_uris(None) == []


# ---------------------------------------------------------------------------
# Base64 padding helper
# ---------------------------------------------------------------------------

class TestFixBase64Padding:
    """_fix_base64_padding static helper."""

    def test_adds_padding(self) -> None:
        assert SubscriptionParser._fix_base64_padding("abc") == "abc="
        assert SubscriptionParser._fix_base64_padding("ab") == "ab=="

    def test_no_padding_needed(self) -> None:
        assert SubscriptionParser._fix_base64_padding("abcd") == "abcd"
        assert SubscriptionParser._fix_base64_padding("abcdef12") == "abcdef12"
